/**
 * jspsych-fittss-law.js
 * Saizo Aoyagi
 *
 * plugin for One dimentional fitts's low test
 *
 * When the mouse cursor hover the home, the target will be shown.
 *
 * response:
 *   rt_total: elapsed time from the time home element was shown
 *   error: whether the cursor touched the edge
 **/
jsPsych.plugins["fittss-law"] = (function () {

    const plugin = {};

    plugin.info = {
        name: 'fittss-law',
        description: "One dimentional Fitts's low test",
        parameters: {
            distance: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'distance',
                array: false,
                default: 1,
                description: 'The movement distance from the starting position to the target center'
            },
            width: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'width',
                array: false,
                default: 1,
                description: 'Target width'
            },
            theta: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'theta',
                array: false,
                default: 0,
                description: 'Target position (angle)'
            },
            goal_width: {
                type: jsPsych.plugins.parameterType.FLOAT,
                pretty_name: 'goal_width',
                array: false,
                default: 5,
                description: 'Width of center of goal'
            },
            view_width: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'view_width',
                array: false,
                default: 800,
                description: 'Width of the view (px)'
            },
            view_height: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'view_height',
                array: false,
                default: 400,
                description: 'Height of the view (px)'
            },
            rotation: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'configuration',
                array: false,
                default: 0,
                description: 'The rotation of elements in degree unit '
            },
            pre_target_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Pre-target duration',
                default: 0,
                description: 'The number of milliseconds to display the grid before the target changes color.'
            },
            response_ends_trial: {
                type: jsPsych.plugins.parameterType.BOOL,
                pretty_name: 'Response ends trial',
                default: true,
                description: 'If true, the trial ends after a key press.'
            },
            trial_duration: {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Trial duration',
                default: null,
                description: 'How long to show the trial'
            },
            prompt: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Prompt',
                default: null,
                description: 'Any content here will be displayed below the stimulus'
            },
            tag: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Tag',
                default: "",
                description: 'Extra free text which is added to results'
            },
            color: {
                type: jsPsych.plugins.parameterType.STRING,
                pretty_name: 'Color',
                default: "green",
                description: 'Filling color for object'
            },
            wait : {
                type: jsPsych.plugins.parameterType.INT,
                pretty_name: 'Wait',
                default: 500,
                description: 'Waiting time for object targeting (ms)'
            },
        }
    };

    plugin.trial = function (displayElement, trial) {

        let startTimeFromShown = -1;
        let startTimeTotal = -1;
        let stimulus = null;
        
        let onTarget = false;
        let waitTimer = null;

        const response = {
            rt: null,
            rt_total: null,
            distance: null,
            width: null,
            error: false,
            degree: null,
            tag: trial.tag,
            start_x: null,
            start_y: null,
        };

        const current = {
            x:null,
            y:null
        };



        // const showGoal = function () {
        //     const goal = displayElement.querySelector('#jspsych-fittss-law-true-goal');
        //     goal.addEventListener('mouseenter', function(e) {
        //         if (startTimeFromShown !== -1) {
        //             response.rt_total = performance.now() - startTimeTotal;
        //             response.rt = performance.now() - startTimeFromShown;
        //             afterResponce();
        //         }
        //     });
        // };

        // 何故かshowGoalだとイベントハンドラを設定できないため
        window.showGoal2 = function(e) {
            if (startTimeFromShown !== -1) {
                if(!!waitTimer){
                    clearTimeout(waitTimer);
                }
                waitTimer = setTimeout(function(){
                    finish();
                }, trial.wait)
            }
        };

        window.leaved = function(e){
            if(!!waitTimer){
                clearTimeout(waitTimer);
            }
        }

        const finish = function(){
            response.rt_total = performance.now() - startTimeTotal;
            response.rt = performance.now() - startTimeFromShown;
            afterResponce();
        }

        const endTrial = function () {

            // kill any remaining setTimeout handlers
            jsPsych.pluginAPI.clearAllTimeouts();

            // gather the data to store for the trial
            const trialData = {
                "rt": response.rt,
                "rt_total": response.rt_total,
                "width": trial.width,
                "distance": trial.distance,
                "theta": trial.theta,
                "tag": trial.tag,
                "color": trial.color,
                "x": current.x,
                "y": current.y
            };

            // clear the display
            displayElement.innerHTML = '';

            // move on to the next trial
            jsPsych.finishTrial(trialData);

        };

        const afterResponce = function (info) {
            // function to handle responses by the subject

            if (trial.response_ends_trial) {
                endTrial();
            }
        };

        const start = function(){
            displayElement.style.display="block";
            startTimeFromShown = performance.now();
            response.start_x = current.x;
            response.start_y = current.y;
            //showGoal();
        };

        const position = function(e){
            const rect = e.currentTarget.getBoundingClientRect();
            current.x = e.clientX - rect.left;
            current.y = e.clientY - rect.top;

            // let str = x + ", " + y;
            // console.log(str)
        };

        // create stimulus
        displayElement.style.display="none";
        stimulus = this.stimulus(trial.distance, trial.width, trial.theta, trial.goal_width, trial.view_height, trial.view_width, trial.color, trial.prompt);
        displayElement.innerHTML = stimulus;


        // capture mouse pos
        displayElement.addEventListener("mousemove", position);

        startTimeTotal = performance.now();
        if (trial.pre_target_duration <= 0) {
            start();
        } else {
            jsPsych.pluginAPI.setTimeout(start, trial.pre_target_duration);
        }

        //show prompt if there is one
        if (trial.prompt !== null) {
            displayElement.innerHTML += "<div>" + trial.prompt + "</div>";
        }
    };

    /**
     * Get stimuls html
     */
    plugin.stimulus = function (distance, width, theta, goal_width,viewHeight,viewWidth, color, prompt) {

        const viewStyle = '';
        let htmlObj = [
            '<svg id="jspsych-fittss-law-stimulus" ' +
            '"http://www.w3.org/2000/svg" viewBox="0 0 ' + viewWidth + ' ' + viewHeight + '" ' + viewStyle + ' ' +
            'style=" width:'+ viewWidth +'; height:'+viewHeight+';" preserveAspectRatio="none" >'
        ];


        // goal
        const goalX = distance * Math.cos(theta) + viewWidth/2;
        const goalY = distance * Math.sin(theta) + viewHeight/2;

        const goalStyle = 'cx="'+goalX+'"cy="'+goalY+'" r="'+width+'" fill="'+color+'" stroke="'+color+'" stroke-width="2"';
        htmlObj.push('<circle  id="jspsych-fittss-law-goal" ' + goalStyle + ' >' +
            '<text x="'+goalX+'" y="'+goalY+'" >' +
            'Goal' +
            '</text>' +
            '</circle >');

        // true goal
        const trueGoalStyle = 'cx="'+goalX+'"cy="'+goalY+'" r="'+goal_width+'" fill="transparent" stroke="transparent" stroke-width="2"';
        htmlObj.push('<circle  id="jspsych-fittss-law-true-goal" ' + trueGoalStyle + ' onmouseenter="showGoal2()" ="leaved()"   ></circle >');


        htmlObj.push('</svg><br />');

        html = htmlObj.join('');

        return html;
    };

    return plugin;
})();