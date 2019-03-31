const express = require('express'),
      http = require('http'),
      path = require('path'),

      bodyParser = require('body-parser'),
      cookieParser = require('cookie-parser'),
      static = require('serve-static'),
      errorHandler = require('errorhandler'),

      expressErrorHandler = require('express-error-handler'),

      session = require('express-session'),

      MongoClient = require('mongodb').MongoClient;  // mongo db 모듈. MongoClient의 M은 대문자로

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

function connectDB(){  // 데이터베이스 연결 함수 정의
    let databaseUrl = 'mongodb://localhost:27017';  // 연결정보를 문자열로 정의 'mongodb://%IP정보%:%포트정보%/'
    MongoClient.connect(databaseUrl, (err, database)=>{  // 데이터베이스 연결
        if(err) throw err;
        console.log('데이터베이스에 연결되었습니다. : '+ databaseUrl);
        myDatabase = database.db('local');  // 반환된_database_객체.db('데이터베이스이름') -> 데이터베이스 객체에 할당
    });
}

let authUser = (database, id, password, callback)=>{  // 사용자를 인증하는 함수
    console.log('authUser 호출됨.');
    let users = database.collection('users');  // users 컬렉션 참조
    users.find({"id":id, "password":password}).toArray((err, docs)=>{  // find()를 통해 데이터를 조회, 결과를 배열객체로 변환. docs: 변환된 문서 객체
        if(err){
            callback(err, null);
            return;
        }
        if(docs.length > 0){  // 일치하는 문서가 조회된 경우
            console.log(`아이디: ${id}, 비밀번호: ${password} 일치하는 사용자 찾음.`);
            callback(null, docs);  // callback을 이용하면 함수를 호출한 쪽에서 docs를 전달 받을 수 있음
        } else{
            console.log('일치하는 사용자 찾지 못함.');
            callback(null, docs);
        }
    });
}

let addUser = function(database, id, password, name, callback){
    console.log(`addUser 호출됨 : ${id}, ${password}, ${name}`);
    let users = database.collection('users');  // users 컬렉션 참조
    users.insertMany([{"id":id, "password":password, "name":name}], (err, results)=>{  // 성공적으로 데이터가 추가되면 콜백을 통해 결과객체를 전달
        if(err){
            callback(err, null);
            return;
        }
        if(results.insertedCount>0){  // results_결과객체.insertedCount():추가된 레코드의 개수를 알려준다.
            console.log(`사용자 레코드 추가됨: ${results.insertedCount}`);
        } else{
            console.log('추가된 레코드 없음.');
        }
        callback(null, results);
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
            if(result && result.insertedCount > 0){
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