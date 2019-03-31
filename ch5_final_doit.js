const express = require('express'),
      http = require('http'),
      path = require('path'),
      bodyParser = require('body-parser'),
      static = require('serve-static'),
      cookieParser = require('cookie-parser'),
      session = require('express-session'),
      multer = require('multer'),
      fs = require('fs'),
      cors = require('cors');

const exp = express();

const router = express.Router();

exp.set('port', process.env.PORT || 3000);

exp.use(bodyParser.urlencoded({ extended: false }));
exp.use(bodyParser.json());

exp.use('/public', static(path.join(__dirname, 'public')));
exp.use('/uploads', static(path.join(__dirname, 'uploads')));

exp.use(cookieParser());
exp.use(session(
  {
    secret: 'my key @#$%',
    resave: true,
    saveUninitialized: true
  }
));

exp.use(cors());

let storage = multer.diskStorage({
	destination: (req, file, callback)=>{
    	callback(null, 'uploads')
	},
	filename: (req, file, callback)=>{
    	callback(null, file.originalname + Date.now())
	}
});

let upload = multer({
	storage: storage,
	limit: {
		files: 10,
		fileSize: 1024*1024*1024
	}
}) ;

router.route('/process/photo').post(upload.array('photo', 1), (req, res)=>{
	console.log('/process/photo 호출됨');
	try{
		let files = req.files;  // 업로드한 파일의 정보
		
		console.dir('#===== 업로드된 첫 번째 파일 정보 =====#');
		console.dir(req.files[0]);
		console.dir('#=====#');
		
		let originalname = '',  // 파일의 정보를 저장할 수 있는 변수 선언
			filename = '',
			mimetype = '',
			size = 0;
		
		if(Array.isArray(files)){  // 배열에 들어있는 경우
			console.log('배열에 들어있는 파일 개수: %d', files.length);
			for(let index = 0; index<files.length; index++){
				originalname = files[index].originalname;
				filename = files[index].filename;
				mimetype = files[index].mimetype;
				size = files[index].size;
			}
		} else{
			console.log('파일 갯수: 1');
			originalname = files[index].originalname;
			filename = files[index].filename;
			mimetype = files[index].mimetype;
			size = files[index].size;
		}
		console.log(`현재 파일 정보: ${originalname}, ${filename}, ${mimetype}, ${size}}`);
		res.writeHead('200', {'Contend-Type':"text/html;charset='utf8'"});
		res.write('<h1>파일 업로드 성공</h1>');
		res.write('<hr/>');
		res.write(`원본파일이름: ${originalname}, 저장파일명: ${filename}, mimetype: ${mimetype}, 파일크기:${size}}`);
		res.end();
	} catch(err){
		console.dir(err.stack);
  }
});

/*

router.route('/process/product').get((req, res)=>{
  console.log('/process/product 호출됨.');
  if(req.session.user){
    res.redirect('/public/product.html');
  } else{
    res.redirect('/public/login.html');
  }
});

router.route('/process/login').post((req, res)=>{
  console.log('/process/login 호출됨.');
  let paramId = req.body.id || req.query.id,
      paramPassword = req.body.password || req.query.password;
  if(req.session.user){
    console.log('이미 로그인되어 상품 페이지로 이동합니다.');
    res.redirect('/public/product.html');
  } else{
    req.session.user = {
      id: paramId,
      name: 'name_신희창',
      authorized: true
    };
    res.writeHead('200', {'Contend-Type':'text/html;charset=utf8'});
    res.write('<h1>로그인 성공</h1>');
    res.write(paramId, paramPassword);
    res.write("<a href='/process/product'>상품페이지로 이동하기</a>");
    res.end();
  }
});

router.route('/process/logout').get((req,res)=>{
  console.log('/process/logout 호출됨.');
  if(req.session.user){
    console.log('로그아웃합니다.');
    req.session.destroy((err)=>{
      if(err) console.log(err);
      console.log('세션 삭제, 로그아웃 성공');
      res.redirect('/public/login.html');
    });
  } else{
    console.log('아직 로그인 되어있지 않습닏.');
    res.redirect('/public/login.html');
  }
});

*/

exp.use('/', router);
http.createServer(exp).listen(3000, ()=>{
  console.log('3000번 express 서버가 연결되었습니다.')
});