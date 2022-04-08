const ffmpeg = require('ffmpeg-static');
const {spawn} = require('child_process');
const {createWriteStream} = require('fs');

//"-itsscale", "1",
//输入选项 没有使用
//使用-vf 设置一下好像会影响到录制的输出码率? 诡异


//编码的选项
const codecOptions=[
	"-acodec", "aac",
	"-vcodec", "libx264rgb",
"-bufsize", "0",
	"-rtbufsize", "1000k",
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
			"-i", "desktop",
			"-offset_x", "1920",
		]
	},
	//TODO
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
/*
//video
const inputOptions1=[
	"-f", "v4l2",
	"-framerate", "15",
	"-s", "1280x720",
	"-i", "/dev/video0",
];
//screen1
const inputOptions2=[
	"-f", "x11grab",
	"-framerate", "5",
	"-s", "1920x1080",
	"-i", ":0.0",
];
//screen2
const inputOptions3=[
	"-f", "x11grab",
	"-framerate", "5",
	"-s", "1920x1080",
	"-i", ":0.0+1920,0",
];
*/


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
	//"-vcodec", "libx264rgb",

	//"-bufsize", "1M",
	//"-maxrate", "1M",
	//"-b:v", "1M",
	//"-preset", "ultrafast",
	//"-tune", "zerolatency",

	//录制的分辨率控制
	//"-vf", "scale=1600x900,setsar=1:1",
	//"-crf", "0",
	//"test.mp4"
];
const generalOptions=["-y",];
//order 只有两个, 摄像头和屏幕
function buildParams(order, targetUrl, recordName){
	
	var inputOption= process.platform in allOptions ? allOptions[process.platform] : null;
	if(inputOption == null){
		//不支持的操作系统类型 目前支持windows/mac/linux 
		console.log("不支持的操作系统类型 : ",process.platform);
		return ;
	}

	if(targetUrl==null || recordName == null){
		return [];
	}
	var result=[];
	if(order==1){
		result= generalOptions.concat(inputOption["camera"]);
	}else if(order==2){
		result= generalOptions.concat(inputOption["screen1"]);
	}else {
		result= generalOptions.concat(inputOption["screen2"]);
	}
	result=result.concat(streamingOptions);
	//摄像头的码率限制一下
	if(order == 1){
	    result.push("-bufsize");
		result.push( "4000k");
	    result.push("-maxrate");
		result.push( "4000k");
	    result.push("-b:v");
		result.push( "4000k");
	}
	result=result.concat(codecOptions);
	result=result.concat(outputOptions);

	//url
	result.push(targetUrl);

	result=result.concat(recordingOptions);
	
	//摄像头加上-crf 选项 录制非常大(60M/s)(Linux 上测试), 屏幕不加crf选项, 录制非常差(完全花屏)
	//如果不是摄像头就加上这个选项
	if(order != 1 ){

	    result.push("-bufsize");
		result.push( "2M");
	    result.push("-maxrate");
		result.push( "1M");
	    result.push("-b:v");
		result.push( "800k");

		result.push("-preset");
		result.push("superfast");

		result.push("-crf");
		result.push("18");
		//result.push("-qp");
		//result.push("0");
	}else{
		
	    result.push("-bufsize");
		result.push( "384k");
	    result.push("-maxrate");
		result.push( "600k");
	    result.push("-b:v");
		result.push( "600k");

		result.push("-preset");
		result.push("superfast");
		result.push("-tune");
		result.push("zerolatency");
		
	}
	result.push(recordName);
	
	return result;
}

const process1 = spawn(
  ffmpeg,
  //buildParams(1,"rtsp://172.28.32.13/live/test3","camera.mp4")
  buildParams(1,"rtsp://119.3.244.32:20163/live/test3","camera.mp4")
);
process1.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });


const process2 = spawn(
  ffmpeg,
  buildParams(2,"rtsp://119.3.244.32:20163/live/test4","screen1.mp4")
);
process2.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });



const process3 = spawn(
  ffmpeg,
  buildParams(3,"rtsp://119.3.244.32:20163/live/test5","screen2.mp4")
);
process3.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });


/*
process.on("SIGINT", function(){
	process1.kill('SIGTERM');
	process2.kill('SIGTERM');
	process3.kill('SIGTERM');
})
*/


