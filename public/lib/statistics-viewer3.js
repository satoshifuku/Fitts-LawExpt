/**
 * グラフ用
 */
const SV3 = {
    config: {
        firestore: {
            collection: {
                production: "production",
                default: "default"
            }
        },
        firebase: {},
        firebase_file_path: "../config.json"

    },
    defaultColor: "rgba(255, 0, 0, 0.8)",
    data:[],
    charts:[],
    db:null,
    dataKeys:[]
};
window["SV3"] = SV3;
(function(){
    /*
    firebase
    */


    SV3.init = (environment, callback) => {

        // parameters
        let firebaseFilePath = SV3.config.firebase_file_path;

        if(typeof environment === "object"){
            const options = environment;
            if(!!options.environment){
                environment = options.environment;
            }
            if(!!options.firebase_file_path){
                firebaseFilePath = options.firebase_file_path
            }
        }

        // firebase check
        if(!firebase){
            console.error("Firebase is not loaded");
            return false;
        }

        // load config file
        const request = new XMLHttpRequest();
        request.open('GET', firebaseFilePath, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                // Success!
                const resp = request.responseText;
                try{
                    SV3.config.firebase = JSON.parse(resp);

                    let firebaseConfig = SV3.config.firebase.default;
                    if(environment === "production"){
                        if(!SV3.config.firebase.production){
                            firebaseConfig = SV3.config.firebase.production;
                        }
                    }

                    // Initialize Firebase
                    firebase.initializeApp(firebaseConfig);

                    firebase.auth().onAuthStateChanged(function(user) {
                        if (user) {

                            console.debug(firebase.auth().currentUser);

                            callback();
                        }
                    });

                    SV3.db = firebase.firestore();
                    SV3.login();
                    console.log("Firebase was initialised");

                }catch(error){
                    console.error(error.message)
                }


            } else {
                // We reached our target server, but it returned an error

            }
        };
        request.onerror = function() {
            // There was a connection error of some sort
        };

        request.send();



    };

    /**
     * ログイン処理
     */
    SV3.login = () => {
        if(!firebase){
            console.error("Firebase is not loaded");
            return false;
        }
        if (!firebase.auth().currentUser) {
            // [START authanon]
            firebase.auth().signInAnonymously().catch(function(error) {
                // Handle Errors here.
                const errorCode = error.code;
                const errorMessage = error.message;
                // [START_EXCLUDE]
                if (errorCode === 'auth/operation-not-allowed') {
                    alert('You must enable Anonymous auth in the Firebase Console.');
                } else {
                    console.error(error);
                }
                // [END_EXCLUDE]
            });
            // [END authanon]

        }
    };



    /*
    グラフ
    */

    /**
     * 描画開始
     * @param procedure
     * @param chart
     */
    SV3.run = (procedure, chartConfigs) => {
        SV3.createCSVLink();

        SV3.init("default", ()=> {
            SV3.getAnswers(procedure, "default", SV3.dataItemReceived);
            let i = 0;
            chartConfigs.forEach((chartConfig) => {
                const chartObj = {
                    colors:[],
                    data:[],
                    ctx:null,
                    chart:null,
                    x:chartConfig.x,
                    y:chartConfig.y,
                    skip:chartConfig.skip
                };
                SV3.charts.push(chartObj);
                SV3.createCSVLink(i);
                SV3[chartConfig.type](i,  chartConfig.title, chartConfig.x_label, chartConfig.y_label);
                i++;
            })
           
        });
    };

    SV3.getAnswers = (procedure, version, callback) => {
        if(!version){
            version = "default";
        }
        const user = firebase.auth().currentUser;
        var c_user;
        if (user) {
          // User is signed in.
          c_user = user.uid;
        } else {
          console.log("No usr")
        }

        SV3.db.collection("procedures").doc(procedure).collection("versions").doc(version).collection("users").doc(c_user).collection("answers").get().then((ansQS) => {
            ansQS.forEach((ansDoc) => {
                callback(ansDoc.data());
            });
        }).catch((error) => {
            console.error(error);
        });
    };

    SV3.createCSVLink = (dataId) => {
        const elem = document.createElement("a");
        
        elem.className = "btn btn-link csv-link d-block text-left";
        elem.setAttribute("href", "#")
        
        if(dataId === null || dataId === undefined){
            elem.setAttribute("id", "link-results-all");
            elem.addEventListener("click", SV3.createCSVAll);
            elem.text = "Download CSV of All data";
        }else{
            elem.setAttribute("id", "link-results-"+dataId);
            elem.addEventListener("click", SV3.createCSV);
            elem.text = "Download CSV";
        }
       
        document.getElementById('results').appendChild(elem);
    };

    SV3.scatter = (dataId, title, xLabel, yLabel) => {
        const chartObj = SV3.charts[dataId];
    
        const elem = document.createElement("canvas");
        elem.setAttribute("id", "results-"+dataId);
        elem.setAttribute("data-data-id", dataId);
        elem.setAttribute("width", 600);
        elem.setAttribute("height", 600);
        elem.className = "mb-5";
        document.getElementById('results').appendChild(elem);
        
        chartObj.ctx = elem.getContext('2d');
        chartObj.chart = new Chart(chartObj.ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: "answer",
                    // data: [{
                    //     x: -10,
                    //     y: 0
                    // }, {
                    //     x: 0,
                    //     y: 10
                    // }, {
                    //     x: 10,
                    //     y: 5
                    // }]
                    data: chartObj.data,
                    backgroundColor: chartObj.colors
                }],

            },
            options: {
                title: {                           //タイトル設定
                    display: true,                 //表示設定
                    fontSize: 18,                  //フォントサイズ
                    text: title                //ラベル
                },
                scales: {
                    xAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: xLabel
                        },
                        type: 'linear',
                        position: 'bottom'
                    }],
                    yAxes: [{
                        scaleLabel: {
                            display: true,
                            labelString: yLabel
                        },
                        type: 'linear',
                        position: 'left',
                        ticks: {
                            max: 5000
                        }
                    }]
                },
                scaleOverride : true,
            }
        });
    };

    SV3.dataItemReceived = (datum) => {
        //console.debug(item);
        SV3.data.push(datum);

        const keysNow =  Object.keys(datum);
        keysNow.forEach((key) => {
            if(!SV3.dataKeys.find((k) => {return k == key})){
                SV3.dataKeys.push(key)
            }
        })
        
        SV3.charts.forEach((chartObj) => {     
            
            if(!!chartObj.skip && chartObj.skip.find((i)=>{return i == datum.tag})){
                return;
            }

            chartObj.data.push({
                x: datum[chartObj.x],
                y: datum[chartObj.y],
              
            });
            chartObj.colors.push(
                SV3.defaultColor
            );
            chartObj.chart.update();
        })
    };


    SV3.createCSVAll = (e) => {
        const rows = SV3.data;
        if(rows.length == 0){
            alert("No data");
            return;
        }

        let csvContent = "data:text/csv;charset=utf-8,";

        const keys = SV3.dataKeys
        csvContent += keys.join(",") + "\r\n";

        rows.forEach((obj) => {
            const rows = [];
            keys.forEach((key) => {
                rows.push(obj[key]);
            })
            csvContent += rows.join(",") + "\r\n";
        });

        var encodedUri = encodeURI(csvContent);
        e.currentTarget.setAttribute("href", encodedUri);
        e.currentTarget.setAttribute("download", "all.csv");
    }

    SV3.createCSV = (e) => {
        const dataId = e.currentTarget.getAttribute("data-data-id");
        const chartObj =  SV3.charts[Number(dataId)];
        const rows = chartObj.data;

        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += chartObj.x + "," + chartObj.y + "\r\n";

        rows.forEach(function(obj) {
            csvContent += obj.x + "," + obj.y + "\r\n";
        });

        var encodedUri = encodeURI(csvContent);
        window.open(encodedUri);
    }

})();
