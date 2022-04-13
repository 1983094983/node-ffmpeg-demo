const ffmpeg = require('ffmpeg-static');
//TODO 引入ffmpeg
// const ffmpeg = null;
const {spawn} = require('child_process');

//"-itsscale", "1",
//输入选项 没有使用
//使用-vf 设置一下好像会影响到录制的输出码率? 诡异


//编码的选项
const codecOptions=[
	"-acodec", "aac",
	"-vcodec", "libx264rgb",
"-bufsize", "0",
];
//跨平台的处理
//这里的键 的定义方法
//第一层的键 : aix darwin freebsd linux openbsd sunos win32 android 这里的键 是process.platform 的可选值, 支持一种系统加一个键
//第二层的键 : camera screen1 screen2 现在只支持一个摄像头两个屏幕,  更多屏幕的情况还没有考虑, 目前使用ffmpeg推流需要计算像素的偏移
//    		   来定位到屏幕 有一些复杂情况没有考虑, 比如第一个屏幕1024分辨率, 第二个1920分辨率, 第三个屏幕3840分辨率...., 这个可能需要
//    		   通过计算来定位
const allOptions= {
	"win32":{
		"camera":[
			"-f", "dshow",
			//这个需要使用探测到的设备
			"-i", "video=Chicony USB2.0 Camera",
			"-r", "15",
			"-s", "1280x720",
		],
		"screen1":[
			"-f", "gdigrab",
			"-framerate", "5",
			"-s", "1920x1080",
			"-i", "desktop",
		],
		"screen2":[
			"-f", "gdigrab",
			"-framerate", "5",
			"-s", "1920x1080",
			"-offset_x", "1920",
			"-i", "desktop",
		]
	},
	//TODO mac系统的输入设备
	"darwin":{
		"camera":[],
		"screen1":[],
		"screen2":[]
	},
	
	"linux":{
		"camera":[
			"-f", "v4l2",
			"-framerate", "15",
			"-s", "1280x720",
			"-i", "/dev/video0",
		],
		"screen1":[
			"-f", "x11grab",
			"-framerate", "5",
			"-s", "1920x1080",
			"-i", ":0.0",
		],
		"screen2":[
			"-f", "x11grab",
			"-framerate", "5",
			"-s", "1920x1080",
			"-i", ":0.0+1920,0",
		]
	}
	
};


//推流的选项, 主要是降低延迟
const streamingOptions=[
	"-fflags", "nobuffer",
	"-analyzeduration", "0",
	"-probesize", "32",
	"-tune", "zerolatency",
"-max_muxing_queue_size", "0",
	"-sc_threshold", "499",
	"-preset", "ultrafast",
];
const outputOptions=[
	"-vf", "scale=1280x720,setsar=1:1",
	"-rtsp_transport", "tcp",
	"-f", "rtsp",
	//"rtsp://172.28.32.13/live/test5",
];
const recordingOptions=[
	"-f", "mp4",

	//录制的分辨率控制
	//"-vf", "scale=1600x900,setsar=1:1",
	//"-crf", "0",
	//"test.mp4"
];
	
const generalOptions=["-y","-v", "error", "-rtbufsize", "50M",];


//推流参数
//order 只有两个, 摄像头和屏幕
// function buildStreamParams(order : Number , targetUrl : string){
function buildStreamParams(order , targetUrl ){

	if(targetUrl==null){
		return [];
	}
	var result=buildSourceParams(order);
	if(!result){
		//系统类型不支持， windows/mac/linux
		return result;
	}
	result=result.concat(streamingOptions);
	
	result=result.concat(codecOptions);
	// crf 推流
	result .push("-crf");
	//视频质量损失  传18 是无损
	result.push("38");
	result=result.concat(outputOptions);

	//url
	result.push(targetUrl);

	
	
	return result;
}


// 录制的参数
function buildRecordParams(order  , recordName){
		
	if(recordName==null){
		return [];
	}
	var result=buildSourceParams(order);
	if(!result){
		//系统类型不支持， windows/mac/linux
		return result;
	}
	result=result.concat(codecOptions);

	result=result.concat(recordingOptions);
	
	result .push("-crf");
	//视频质量损失  传18 是无损
	result.push("38");

	result.push(recordName);
	
	return result;
}


/**
 * 摄像头只能用一个进程进行推流和录制，两个进程会显示被占用， 这个函数是用作推流和录制
 * @returns params
 */
function buildSingleProcessStreamAndRecordParams(order , targetUrl , recordName){
		

	if(targetUrl==null || recordName == null){
		return [];
	}
	var result=buildSourceParams(order);
	if(!result){
		//系统类型不支持， windows/mac/linux
		return result;
	}
	result=result.concat(streamingOptions);
	result=result.concat(codecOptions);
	result=result.concat(outputOptions);
	result.push("-crf");
	result.push("38");
	//url
	result.push(targetUrl);

	result=result.concat(recordingOptions);
	
	//摄像头加上-crf 选项 录制非常大(60M/s)(Linux 上测试), 屏幕不加crf选项, 录制非常差(完全花屏)
	//如果不是摄像头就加上这个选项
	result.push("-crf");
	result.push("38");
	result.push(recordName);
	
	return result;
}

//ffmpeg 摄像头推流（从模板构建参数）
function buildParamsFromTemplate(order, targetUrl, recordName){
	var params = [];
	params = generalOptions.concat(buildSourceParams(order))
	// reutrn
	return params.concat([
		// "-y",
		// "-y","-v","error",
		// "-rtbufsize","50M",
		// "-f","dshow",
		// "-i","video=Chicony USB2.0 Camera",
		// "-r","15",
		// "-s","1280x720",
		"-fflags","nobuffer",
		"-analyzeduration","0",
		"-probesize","32",
		"-tune","zerolatency",
		"-max_muxing_queue_size","0",
		"-sc_threshold","499",
		"-preset","ultrafast",
		"-vcodec","libx264rgb",
		"-bufsize","0",
		"-filter_complex","split [main][tmp]",
		"-map",
		"[main]",
		"-crf","34",
		"-rtsp_transport","tcp",
		"-f","rtsp",
		targetUrl,
		"-map","[tmp]",
		"-crf","34",
		"-preset","ultrafast",
		"-f","mp4",
		recordName
	]);
	// ffmpeg -y  -v error -rtbufsize 50M  -y -f dshow  -i video="Chicony USB2.0 Camera"  -r 15 -s 1280x720  -fflags nobuffer -analyzeduration 0 -probesize 32 -tune zerolatency   -max_muxing_queue_size 0 -sc_threshold 499 -preset ultrafast  -vcodec libx264rgb -bufsize 0                                          -filter_complex "split [main][tmp]"   -map "[main]" -crf 38 -rtsp_transport tcp -f rtsp rtsp://119.3.244.32:20163/live/test3 -map "[tmp]" -crf 38 -preset ultrafast  -f mp4 camera.mp4
}

/**
 * 构建推流的源的params
 * @returns 
 */
function buildSourceParams(order){
	var inputOption= process.platform in allOptions ? allOptions[process.platform] : null;
	if(inputOption == null){
		console.error("不支持的操作系统类型 : ",process.platform);
		return [];
	}
	if(order==1){
		result= generalOptions.concat(inputOption["camera"]);
	}else if(order==2){
		result= generalOptions.concat(inputOption["screen1"]);
	}else {
		result= generalOptions.concat(inputOption["screen2"]);
	}
	return result;
}



class ffmpegStream{
    //TODO 如果要实现分辨率的设置, 需要修改部分内容, 将分辨率作为参数在这里传入, 或者用枚举进行选择
	//推流子进程
    ffmpegStreamProcess;
	//录制子进程
	ffmpegRecordProcess;

    order ;
    streamUrl ;
    recordName ;
    execFfmpeg(order  , streamUrl  , recordName ){
        const ffmpegStreamProcess = spawn(ffmpeg, buildStreamParams(order, streamUrl));
        this.ffmpegStreamProcess = ffmpegStreamProcess;
		const ffmpegRecordProcess = spawn(ffmpeg, buildRecordParams(order , recordName));
		this.ffmpegRecordProcess = ffmpegRecordProcess;
		
        this.order = order;
        this.streamUrl = streamUrl;
        this.recordName = recordName;
        return this;
    }

    stop(){
        //TODO 停止ffmpeg (windows中可能需要处理ffmpeg进程的关闭, 使用SIGINT 会直接杀死进程, 不能写入mp4文件的 moov atom数据导致文件损坏)
    }
}




//摄像头一个进程推流
// const process11 = spawn(
// 	ffmpeg,
// 	buildSingleProcessStreamAndRecordParams(1,"rtsp://119.3.244.32:20163/live/test3","camera.mp4")
// );
// process11.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });
const process11 = spawn(
	ffmpeg,
	//从模板构建参数（摄像头）
	buildParamsFromTemplate(1, "rtsp://119.3.244.32:20163/live/test3","camera.mp4")
);
// console.log(buildParamsFromTemplate("rtsp://119.3.244.32:20163/live/test3","camera.mp4").join(" "))
process11.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });

  
  
const process21 = spawn(
	ffmpeg,
	buildParamsFromTemplate(2,"rtsp://119.3.244.32:20163/live/test4","screen1.mp4")
  );
process21.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });

  
  
const process31 = spawn(
	ffmpeg,
	buildParamsFromTemplate(3,"rtsp://119.3.244.32:20163/live/test5","screen2.mp4")
  );
process31.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });


// const process22 = spawn(
// 	ffmpeg,
// 	buildRecordParams(2,"screen1.mp4")
// );
// const process32 = spawn(
// 	ffmpeg,
// 	buildRecordParams(3,"screen2.mp4")
// );

//终止
setInterval(function(){
	process11.stdin.setEncoding('utf8');
	process11.stdin.write('q\n');

	process21.stdin.setEncoding('utf8');
	process21.stdin.write('q\n');

	process31.stdin.setEncoding('utf8');
	process31.stdin.write('q\n');

	// process22.stdin.setEncoding('utf8');
	// process22.stdin.write('q\n');

	// process32.stdin.setEncoding('utf8');
	// process32.stdin.write('q\n');
} , 1000 * 60);