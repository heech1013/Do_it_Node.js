const express = require('express'),
      http = require('http'),
      path = require('path'),

      bodyParser = require('body-parser'),
      cookieParser = require('cookie-parser'),
      static = require('serve-static'),
      errorHandler = require('errorhandler'),

      expressErrorHandler = require('express-error-handler'),

      session = require('express-session'),

      MongoClient = require('mongodb').MongoClient,  // mongo db 모듈. MongoClient의 M은 대문자로
      mongoose = require('mongoose');

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

let myDatabase;  // 데이터베이스 객체
let UserSchema;  // 데이터베이스 스키마 객체
let UserModel;  // 데이터베이스 모델 객체

function connectDB(){  // 데이터베이스 연결 함수 정의
    let databaseUrl = 'mongodb://localhost:27017/local';  // 연결정보를 문자열로 정의 'mongodb://%IP정보%:%포트정보%/%데이터베이스이름%' (**mongoose 아닐 때는 다름!)
    console.log('데이터베이스 연결을 시도합니다.');
    mongoose.Promise = global.Promise;
    mongoose.connect(databaseUrl);
    myDatabase = mongoose.connection;  // mongoose.connection: 데이터베이스 연결 시 이벤트 전달

    myDatabase.on('error', console.error.bind(console, 'mongoose connection error'));  // error 이벤트: 데이터베이스 연결이 되지 않을 때 발생
    myDatabase.on('open', ()=>{  // open 이벤트: 데이터베이스 연결 시 발생
        console.log(`데이터베이스에 연결되었습니다: ${databaseUrl}`);
        UserSchema = mongoose.Schema(  // 스키마(컬렉션이 가지는 속성) 정의
            {
                id: {type:String, required:true, unique:true},  // 스키마 타입: 각 속성의 데이터 타입(p.231)
                name: String,
                password: {type:String, required:true}
            }
        );
        console.log('UserSchema 정의함.');

        UserModel = mongoose.model("users", UserSchema);  // UserModel 모델(데이터베이스의 컬렉션 지정) 정의. 1param:'모델이름'(데이터베이스의 같은 이름의 컬렉션과 매칭된다), 2param:스키마 객체
        console.log('UserModel 정의함.');
    });

    myDatabase.on('disconnected', ()=>{
        console.log('연결이 끊어졌습니다. 5초 후 다시 연결합니다.');
        setInterval(connectDB, 5000);
    });
}

let authUser = (database, id, password, callback)=>{  // 사용자를 인증하는 함수
    console.log(`authUser 호출됨: ${id}, ${password}`);
    UserModel.find({"id":id, "password":password}, (err, results)=>{  // 모델 객체에는 문서 객체를 조회, 수정, 삭제할 수 있는 메소드가 들어있다.(p.233)
        if(err){
            callback(err, null);
            return;
        }
        console.log(`아이디 ${id}, 비밀번호 ${password}로 사용자 검색 결과`);
        console.dir(results);
        if(results.length > 0){
            console.log(`일치하는 사용자 찾음: ${id}, ${password}`);
            callback(null, results);
        } else{
            console.log(`일치하는 사용자 찾을 수 없음.`);
            callback(null, null);
        }
    });
}

let addUser = function(database, id, password, name, callback){
    console.log(`addUser 호출됨 : ${id}, ${password}, ${name}`);
    var user = new UserModel({"id":id, "password":password, "name": name});  // UserModel 인스턴스 생성
    user.save((err)=>{  // 모델 (인스턴스) 객체 메소드(p.233)
        if(err){
            callback(err, null);
            return;
        }
        console.log(`사용자 데이터 추가함.`);
        callback(null, user);
    });
}

router.route('/process/addUser').post((req,res)=>{
    console.log('/process/addUser 호출됨.');
    let paramId = req.body.id || req.query.id,
        paramPassword = req.body.password || req.query.password,
        paramName = req.body.name || req.query.name;
    console.log(`요청 파라미터: ${paramId}, ${paramPassword}, ${paramName}`);

    if(myDatabase){
        addUser(myDatabase, paramId, paramPassword, paramName, (err, result)=>{
            if(err) {throw err;}
            if(result && result.id){  // result.insertedCount가 안 먹는 듯 하여 바꿨다.
                console.dir(result);
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 성공</h1>`);
                res.end();
            } else{  // 결과객체가 없을 경우
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 실패</h1>`);
                res.end();
            }
        });
    } else{
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
        res.write(`<h1>데이터베이스 연결 실패</h1>`);
        res.end();
    }
});

exp.post('/process/login', (req, res)=>{
    console.log('/process/login 호출됨.');

    let paramId = req.body.id,
        paramPassword = req.body.password;
    
    if(myDatabase){
        authUser(myDatabase, paramId, paramPassword, (err, docs)=>{
            if(err) {throw err};
            if(docs) {
                console.dir(docs);
                let username = docs[0].name;
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>로그인 성공</h1>`);
                res.write(`<div><p>사용자 아이디: ${paramId} </p></div>`);
                res.write(`<div><p>사용자 이름: ${username} </p></div>`);
                res.write(`<br><br><a href='/public/login.html'>다시 로그인하기</a>`);
                res.end();
            }
        });
    } else {
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});            
        res.write(`<h1>데이터베이스 연결 실패</h1>`);
        res.write(`<div><p>데이터베이스에 연결하지 못했습니다.</p></div>`)
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
    console.log('아직 로그인 되어있지 않습니다.');
    res.redirect('/public/login.html');
  }
});

exp.use('/', router);

exp.use(expressErrorHandler.httpError(404));
exp.use(errorHandler);

http.createServer(exp).listen(exp.get('port'), ()=>{
  console.log('express 서버가 연결되었습니다. 포트:' + exp.get('port'));

  connectDB();  // 콜백함수를 통해 서버 시작 후 데이터베이스 연결
});