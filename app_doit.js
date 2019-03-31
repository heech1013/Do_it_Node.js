const http = require('http')
, express = require('express') 
, path = require('path')
, static = require('serve-static')
, bodyParser =require('body-parser')
, cookieParser = require('cookie-parser')
, expressSession = require('express-session')
, multer = require('multer')  // 파일 업로드용 미들웨어. body-parser, cookie-parser, express-session 미들웨어 후에 등록해야 함.
, fs = require('fs')  // 파일 업로드 후 업로드 한 파일을 다룰 때 사용
, cors = require('cors');  // 클라이언트에서 ajax로 요청했을 때 CORS(다중 서버 접속) 지원. 페이지가 로딩된 서버 이외의 서버에도 접속할 수 있다. cors 모듈 설치해야 함
const app = express();
let router = express.Router();
app.set('port', process.env.PORT || 3000);
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use('/public', static(path.join(__dirname, 'public')));
app.use('/uploads', static(path.join(__dirname, 'upload')));
app.use(cookieParser());
app.use(expressSession({  // 미들웨어에 세션 모듈 추가
    secret:'my key',  // 세션 객체를 호출하여 반환되는 객체를 전달. secret 속성에 키 값을 넣어줌.
    resave:true,
    saveUninitialized:true
}));
app.use(cors());
let storage = multer.diskStorage({  // multer 미들웨어 사용. 사용순서 중요!(body-parser -> multer -> router). 파일 제한: 10개, 1G.
    destination: (req, file, callback)=>{  // destination: 업로드한 파일이 저장될 폴더를 지정
        callback(null, 'uploads')
    },
    filename: (req, file, callback)=>{  // filename: 업로드한 파일의 이름을 바꿈
        callback(null, file.originalname + Date.now())  // 파일의 이름은 중복될 수 있기에 고유한 이름을 붙이는 것이 좋다. Date()는 현재 시간.
    }
});  // multer(의 파라미터에 {객체 전달. 전달되는 객체 안에는 속성{},이나 콜백 함수()를} 설정할 수 있다.)
let upload = multer({  // 
    storage: storage,
    limit: {  // limit: 파일 크기나 파일 개수 등의 제한 속성을 설정하는 객체
        files: 10,
        fileSize: 1024*1024*1024
    }
});

router.route('/process/photo').post(upload.array('photo', 1), (req,res)=>{
    console.log('/process/photo 호출됨');

    try{
        let files = req.files;  // 업로드한 파일의 정보: req.files 배열에 들어있는 원소 참조.
        console.dir('#===== 업로드된 첫번째 파일 정보 =====#');
        console.dir(req.files[0]);
        console.dir('#=====#');
        let originalname = '',  // 현재의 파일 정보를 저장할 변수 선언
        filename = '',
        mimetype = '',
        size = 0;
        if (Array.isArray(files)) {  // 배열에 들어가 있는 경우(설정에서 1개의 파일도 배열에 넣게 했음)
            console.log("배열에 들어있는 파일 갯수: %d", files.length);
            for(let index = 0; index<files.length; index++){  // 파일을 업로드했을 때 업로드한 파일의 정보는 배열 객체로 저장된다.
                originalname = files[index].originalname;  // originalname: 클라이언트에서 보낼 때의 원본 파일 이름
                filename = files[index].filename;  // filename: 서버에 저장될 파일 이름
                mimetype = files[index].mimetype;  // mimetype: 어떤 MIME TYPE으로 전달된 것인지
                size = files[index].size;  // size: 파일 크기
            }
        } else {  // 배열에 들어가 있지 않은 경우(현재 설정에서는 해당 없음)
            console.log("파일 갯수 : 1");
            originalname = files[index].originalname;
                filename = files[index].filename;
                mimetype = files[index].mimetype;
                size = files[index].size;
        }
        console.log(`현재 파일 정보 : ${originalname}, ${filename}, ${mimetype}, ${size}`);
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
        res.write('<h3>파일 업로드 성공</h3>');
        res.write('<hr/>');
        res.write(`<p>원본 파일 이름: ${originalname} -> 저장 파일명: ${filename}</p>`);
        res.write(`<p>MIME TYPE: ${mimetype}</p>`);
        res.write(`<p>파일 크기: ${size}`);
        res.end();
    } catch(err){
        console.dir(err.stack);
    }
});
app.use('/', router);
http.createServer(app).listen(3000, ()=>{
console.log('Express 서버가 3000번 포트에서 시작됨.');
});