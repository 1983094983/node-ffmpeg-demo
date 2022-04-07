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
//这里需要做跨平台的处理, 不同的情况需要不同的选项

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
	"-bufsize", "256k",
	"-maxrate", "400k",
	"-b:v", "400k",
	//"-crf", "0",
	//"test.mp4"
];
const generalOptions=["-y",];
//order 只有两个, 摄像头和屏幕
function buildParams(order, targetUrl, recordName){
	if(targetUrl==null || recordName == null){
		return [];
	}
	var result=[];
	if(order==1){
		result= generalOptions.concat(inputOptions1);
	}else if(order==2){
		result= generalOptions.concat(inputOptions2);
	}else {
		result= generalOptions.concat(inputOptions3);
	}
	result=result.concat(streamingOptions);
	result=result.concat(codecOptions);
	result=result.concat(outputOptions);

	//url
	result.push(targetUrl);

	result=result.concat(recordingOptions);
	
	//摄像头加上-crf 选项 录制非常大(60M/s)(Linux 上测试), 屏幕不加crf选项, 录制非常差(完全花屏)
	//如果不是摄像头就加上这个选项
	if(order != 1 ){
		result.push("-crf");
		result.push("0");
	}
	result.push(recordName);
	
	return result;
}

const process1 = spawn(
  ffmpeg,
  buildParams(1,"rtsp://172.28.32.13/live/test3","camera.mp4")
);
process1.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });


const process2 = spawn(
  ffmpeg,
  buildParams(2,"rtsp://172.28.32.13/live/test4","screen1.mp4")
);
process2.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });



const process3 = spawn(
  ffmpeg,
  buildParams(3,"rtsp://172.28.32.13/live/test5","screen2.mp4")
);
process3.stderr.on('data', chunk => { console.log(chunk.toString('utf8')); });


//const stream = process.stdout;

	/*
stream.on('data', chunk => {
	console.log(chunk.toString('utf8'));
  const base64 = chunk.toString('base64');
  const data = `data:image/png;base64,${base64}`;

  const image = new Image();
  image.src = data;
  ctx.drawImage(image, 0, 0);
});
  */

/*
const file = createWriteStream('capture.flv');
stream.pipe(file);

stream.on('data', chunk => {
  const base64 = chunk.toString('base64');
  const data = `data:image/png;base64,${base64}`;

  const image = new Image();
  image.src = data;
  ctx.drawImage(image, 0, 0);
});
*/
