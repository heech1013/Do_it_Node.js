const express = require('express'),
      http = require('http'),
      path = require('path'),

      bodyParser = require('body-parser'),
      cookieParser = require('cookie-parser'),
      session = require('express-session'),
      static = require('serve-static'),
      errorHandler = require('errorhandler'),
      expressErrorHandler = require('express-error-handler'),

      mysql = require('mysql');

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

let pool = mysql.createPool({  // Connection Pool: 연결 객체가 너무 많이 만들어지는 것을 막고, 한 번 만든 연결을 다시 사용할 수 있게 한다. 연결 후에 다시 pool에 넣어주어야 하는 제약이 있다.
    connectionLimit: 10,  // Pool에서 만들 수 있는 최대 연결 개수를 설정
    host: 'localhost',
    user: 'root',
    pasword: '111111',
    database: 'o2',
    debug: false
});

let authUser = function(database, id, password, callback){ 
    console.log(`authUser 호출됨.`);
    pool.getConnection((err, conn)=>{
        if(err){
            if(conn){
                conn.release();  // 반드시 해제해야 한다.
            }
            callback(err, null);
            return;
        }
        console.log(`데이터베이스 연결 스레드 아이다: ${conn.threadId}`);

        let columns = ['id', 'name', 'age'];
        let tablename = 'users2';

        let exec = conn.query('SELECT ?? FROM ?? WHERE id=? AND password=?', [columns, tablename, id, password], (err, rows)=>{
            conn.release();  // 반드시 해제해야 한다.
            console.log(`실행 대상 SQL: ${exec.sql}`);

            if(rows.length > 0){
                console.log(`아이디 ${id}, 패스워드 ${password}에 일치하는 사용자 찾음.`);
                callback(null, rows);
            } else{
                console.log('일치하는 사용자 찾지 못함.');
                callback(null, null);
            }
        });
    });
}

let addUser = function(id, name, age, password, callback){
    console.log(`addUser 호출됨`);
    pool.getConnection((err, conn)=>{  // Connection Pool에서 연결 객체를 가져온다. conn에 연결객체가 전달. / **오류(권한이 없다고 함)
        if(err){
            if(conn){
                conn.release();  // 반드시 해제해야 한다.
            }
            callback(err, null);
            return;
        }
        console.log(`데이터베이스 연결 스레드 아이디: ${conn.threadId}`);

        let data = {id:id, name:name, age:age, password:password};

        let exec = conn.query('INSERT INTO users2 SET ?', data, (err, results)=>{  // '?'를 통해 data형식으로 객체를 할당 / results에 결과 할당
            conn.release();  // 반드시 해제해야 한다.
            console.log(`실행 대상 SQL: ${exec.sql}`);

            if(err){
                console.log('SQL 실행 시 오류 발생함.');
                console.dir(err);
                callback(err, null);
                return;
            }

            callback(null, results);
        });
    });
}

router.route('/process/login').post((req, res)=>{
    console.log('/process/login 호출됨.');

    let paramId = req.body.id || req.query.id,
        paramPassword = req.body.password || req.query.password;
    console.log(`요청 파라미터: ${paramId}, ${paramPassword}`);

    if(pool){
        authUser(paramId, paramPassword, (err, rows)=>{
            if(err) {
                console.error(`사용자 로그인 중 오류 발생: ${err.stack}`);
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 중 오류 발생</h1>`);
                res.write(`<p>${err.stack}</p>`);
                res.end();
                return;
            };

            if(rows) {
                console.dir(rows);
                let username = rows[0].name;
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

router.route('/process/addUser').post((req,res)=>{
    console.log('/process/addUser 호출됨.');
    let paramId = req.body.id || req.query.id,
        paramPassword = req.body.password || req.query.password,
        paramName = req.body.name || req.query.name,
        paramAge = req.body.age || req.query.age;
    console.log(`요청 파라미터: ${paramId}, ${paramPassword}, ${paramName}, ${paramAge}`);

    if(pool){
        addUser(paramId, paramName, paramAge, paramPassword, (err, addedUser)=>{
            if(err){
                console.error(`사용자 추가 중 오류 발생: ${err.stack}`);
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 중 오류 발생</h1>`);
                res.write(`<p>${err.stack}</p>`);
                res.end();
                return;
            }
            if(addedUser){  // 결과객체가 있을 경우: 성공
                console.dir(addedUser);
                console.log(`inserted ${addedUser.affectedRows} rows`);
                
                let insertId = addedUser.insertId;
                console.log(`추가한 레코드의 아이디: ${insertId}`);
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 성공</h1>`);
                res.end();
            } else{
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 추가 실패</h1>`);
                res.end();
            }
        });
    } else{  // 데이터베이스 객체가 초기화되지 않은 경우
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
        res.write(`<h1>데이터베이스 연결 실패</h1>`);
        res.end();
    } 
});

exp.use('/', router);

exp.use(expressErrorHandler.httpError(404));
exp.use(errorHandler);

http.createServer(exp).listen(exp.get('port'), ()=>{
  console.log('express 서버가 연결되었습니다. 포트:' + exp.get('port'));
});