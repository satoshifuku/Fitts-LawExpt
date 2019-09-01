/**
 * サーバサイド連携ライブラリ
 */
const ServerLink = {}
;
window["ServerLink"] = ServerLink;
(function(){

    /**
     * 初期化
     * @param options
     */
    ServerLink.init = (options) => {
        let backend = "firebase";
        let version = "default";
        if(options){
           backend = options.backend; // バックエンドのBaas/サーバ等
           version = options.version; // 実験手順のバージョン DB記録時に利用する
        }

        ServerLink.config.init(version);
        ServerLink.backend.init(backend);

    };


    /*
     backend
    */
    ServerLink.backend = {};

    ServerLink.backend.init = (backendName) => {
        if(!backendName){
            backendName = "firebase";
        }
        ServerLink.backend.activated = ServerLink.backend[backendName];
        ServerLink.backend.activated.init(ServerLink.config.environment);
    };

    /*
     config
     */
    ServerLink.config = {
        origins:{
            production: ["webapptest-d23bf.web.app"],
        },
        environment: "default",
        version: "default"
    };

    ServerLink.config.init = (version) => {
        ServerLink.config.version = version;

        let environment = "default";
        if(ServerLink.config.origins.production.find((elm) =>
        { return elm === location.origin}) !== undefined){
            environment = "production"
        }

        ServerLink.config.environment = environment;
    };


    /*
     * api
     */
    /**
     * データ保存
     * @param data
     */
    ServerLink.save = (jsPsychData, procedure, callback) => {
        const activeBackend = ServerLink.backend.activated;
        const user = activeBackend.currentUser();

        const data = JSON.parse(jsPsychData.json());

        ServerLink.showIndicator();
        return activeBackend.save(data, procedure, user, ServerLink.config.version).then((results)=>{
            if(typeof callback === "function"){
                callback(results);
            }
        });

    };


    ServerLink.showIndicator = () => {
        let bg = document.getElementById("indicator-container");
       
        if(!bg){
            const elem = document.createElement("div");
            elem.id = "fountainG";
            for(let i = 1; i <= 8; i++){
                let c = document.createElement("div")
                c.id = "fountainG_"+ i;
                c.className = "fountainG";
                elem.appendChild(c);
            }
            bg = document.createElement("div");
            bg.id = "indicator-container";
            bg.appendChild(elem);
            document.body.append(bg);
        }
        
       
    }

})();



/**
 * firebase
 **/
(function(){
    const FirebaseBackend = {
        config: {
            firestore:{
                collection:{
                    production: "production",
                    default: "default"
                }
            },
            firebase: {},
            firebase_file_path: "../config.json"
        },
        db:null
    };

    /**
     * 初期化
     * @param environment string | {environment: string, firebase_file_path: string}
     * @returns {boolean}
     */
    FirebaseBackend.init = (environment) => {

        // parameters
        let firebaseFilePath = FirebaseBackend.config.firebase_file_path;

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
                    FirebaseBackend.config.firebase = JSON.parse(resp);

                    let firebaseConfig = FirebaseBackend.config.firebase.default;
                    if(environment === "production"){
                        if(!FirebaseBackend.config.firebase.production){
                            firebaseConfig = FirebaseBackend.config.firebase.production;
                        }
                    }

                    // Initialize Firebase
                    firebase.initializeApp(firebaseConfig);

                    FirebaseBackend.db = firebase.firestore();
                    FirebaseBackend.login();
                    console.log("Firebase was initialised")
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
    FirebaseBackend.login = () => {
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

            console.debug(firebase.auth().currentUser);
        }
    };



    /**
     * 現在のログイン済みユーザ取得
     * @returns {*}
     */
    FirebaseBackend.currentUser = () => {
        return firebase.auth().currentUser;
    };

    /**
     * 保存処理
     * @returns {*}
     */
    FirebaseBackend.save = (data, procedure, user, version, callback) => {
        const dateString = (new Date()).toISOString();
        const db = FirebaseBackend.db;
        const procedureDocRef = db.collection("procedures").doc(procedure);
        const versionDocRef = procedureDocRef.collection("versions").doc(version);
        const userDocRef = versionDocRef.collection("users").doc(user.uid);
        userDocRef.set({
            created_at: dateString,
            uid:user.uid
        });
        const collRef = userDocRef.collection("answers");
        if(!Array.isArray(data)){
            data = [data];
        }

        const tasks = [];
        data.forEach((datum) => {
            if(!datum.created_at){
                datum.created_at = dateString
            }
            const prom = collRef.add(datum)
            .then(function(docRef) {
                console.log("Document written with ID: ", docRef.id);

            })
            .catch(function(error) {
                console.error("Error adding document: ", error);
            });
            tasks.push(prom);
        });
        return Promise.all(tasks).then((values)=>{
            if(typeof callback === "function") {
                callback(values);
            }

        })
    };

    ServerLink.backend.firebase = FirebaseBackend;

})();


/**
 * Ajax
 */
(function(){
    const AjaxBackend = {};

    AjaxBackend.config = {
        server_url:"localhost"
    };

    AjaxBackend.init = () => {

    };

    AjaxBackend.login = () => {
        console.error("Ajax backend is not implemented")
    };


    AjaxBackend.currentUser = () => {
        console.error("Ajax backend is not implemented")
    };

    AjaxBackend.save = () => {
        console.error("Ajax backend is not implemented")
    };

    /**
     * POSTリクエスト用
     * @param data
     * @param path
     * @param callback
     */
    AjaxBackend.post = (data, path, callback) => {
        const request = new XMLHttpRequest();
        request.open('POST', AjaxBackend.config.server_url + path, true);
        request.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                // Success!
                const resp = request.responseText;
                callback(resp);
            } else {
                // We reached our target server, but it returned an error

            }
        };
        request.onerror = function() {
            // There was a connection error of some sort
        };

        request.send(data);
    };

    /**
     * GETリクエスト用
     * @param data
     * @param path
     * @param callback
     */
    AjaxBackend.get = (data, path, callback) => {
        const request = new XMLHttpRequest();
        request.open('GET', AjaxBackend.config.server_url + path, true);

        request.onload = function() {
            if (request.status >= 200 && request.status < 400) {
                // Success!
                const resp = request.responseText;
                callback(resp);
            } else {
                // We reached our target server, but it returned an error

            }
        };
        request.onerror = function() {
            // There was a connection error of some sort
        };

        request.send();
    };


    ServerLink.backend.ajax = AjaxBackend;
})();