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
      mongodb = require('mongodb'),
      mongoose = require('mongoose'),

      crypto = require('crypto');

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
    
    mongoose.connect(databaseUrl);
    myDatabase = mongoose.connection;  // mongoose.connection: 데이터베이스 연결 시 이벤트 전달

    myDatabase.on('error', console.error.bind(console, 'mongoose connection error'));  // error 이벤트: 데이터베이스 연결이 되지 않을 때 발생
    myDatabase.on('open', function(){  // open 이벤트: 데이터베이스 연결 시 발생
        console.log(`데이터베이스에 연결되었습니다: ${databaseUrl}`);
        
        createUserSchema();  // 스키마를 정의하는 함수
    });

    myDatabase.on('disconnected', connectDB);
}

function createUserSchema(){  // user 스키마 및 모델 객체 생성 함수
    UserSchema = mongoose.Schema(  // 스키마(컬렉션이 가지는 속성) 정의
        {
            id: {type:String, required:true, unique:true, 'default':' '},  // 스키마 타입: 각 속성의 데이터 타입(p.231) / 여러 인덱스를 만들 수 있다.
            hashed_password: {type:String, required:true, 'default':' '},
            salt: {type:String, required:true},
            name: {type:String, index:'hashed', 'default':''},  // index:'hashed': 인덱스 형성
            age: {type:Number, 'default':-1},
            created_at: {type:Date, index:{unique:false}, 'default':Date.now},  // 만들어진 날짜 속성, 인덱스 설정
            updated_at: {type:Date, index:{unique:false}, 'default':Date.now}
        }
    );

    /* virtual()은 문서 객체에 실제로 저장되는 속성이 아니라 가상의 속성을 지정할 수 있다.
    info로 정보를 받지만 문서에 저장할 때는 id와 name으로 저장하는 식.
    단방향 암호화를 위해 사용. */
    UserSchema
        .virtual('password')
        .set(function(password){
            this._password = password,  // 가상의 속성에 저장
            this.salt = this.makeSalt(),  // 오류: TypeError: this.makeSalt is not a function (우선 넘어가겠습니다~)
            this.hashed_password = this.encryptPassword(password);  // 왜 salt를 전달하지 않는지, 문서로 어떤 자료를 어떻게 전달하는지?
            console.log(`virtual password 호출됨: ${this.hashed_password}`);
        })
        .get(function() {return this._password});
    
    console.log('UserSchema 정의함.');

    UserModel = mongoose.model("users3", UserSchema);
    console.log('UserModel 정의함.');

    UserSchema.method('encryptPassword', function(plainText, inSalt){  // 비밀번호 암호화 메소드(모델 인스턴스에서 사용 가능)
        if(inSalt){
            return crypto.createHmac('sha1', inSalt).update(plainText).digest('hex');
        } else{
            return crypto.createHmac('sha1', this.salt).update(plainText).digest('hex');
        }
    });

    UserSchema.method('makeSalt', function(){  // salt값 만들기 함수
        return Math.round(( new Date().valueOf() * Math.random() )) + ' ';
    });

    UserSchema.method('authenticate', function(plainText, inSalt, hashed_password){  // (인스턴스용) 인증 메소드
        if(inSalt){
            console.log(`authenticate 호출됨: ${plainText} -> ${this.encryptPassword(plainText, inSalt)} : ${hashed_password}`);
            return this.encryptPassword(plainText, inSalt) === hashed_password;
        } else{
            console.log(`authenticate 호출됨: ${plainText} -> ${this.encryptPassword(plainText)} : ${hashed_password}`);
            return this.encryptPassword(plainText) === hashed_password;
        }
    });

    UserSchema.path('id').validate(function(id){  // 필수 속성에 대한 유효성 확인. 스키마 객체의 path().validate()는 유효한 값인지 확인할 수 있다.
        return id.length;
    }, 'id 칼럼의 값이 없습니다.');
    UserSchema.path('name').validate(function(name){
        return name.length;
    }, 'name 칼럼의 값이 없습니다.');
}

function findAll(){
    UserModel.find({}, function(err, results){
        if(err) {throw err;}

        if(results){
            console.log(`조회된 user 문서 객체 #0 -> id:${results[0]._doc.id}, name:${results[0]._doc.name}`);
        }
    });
}

let authUser = function(database, id, password, callback){  // 새로 추가한 모델 메소드를 이용하여 사용자를 인증하는 함수
    console.log(`authUser 호출됨: ${id}, ${password}`);

    UserModel.findById(id, function(err, results){
        if(err){
            callback(err, null);
            return;
        }

        console.log(`아이디 ${id}로 사용자 검색 결과`);
        console.dir(results);
        
        if(results.length > 0){
            console.log('아이디와 일치하는 사용자 찾음.');
            let user = new UserModel({id:id});  // 해당 id를 가진 칼럼을 모아놓은 모델 인스턴스 객체 생성
            let authenticated = user.authenticate(password, results[0]._doc.salt, results[0]._doc.hashed_password);

            if(authenticated){
                console.log('비밀번호 일치함.');
                callback(null, results);
            } else{
                console.log('비밀번호 일치하지 않음.');
                callback(null, null);
            }
        } else{
            console.log('아이디와 일치하는 사용자를 찾지 못함.');
            callback(null, null);
        }
    });
}

let addUser = function(database, id, password, name, callback){
    console.log(`addUser 호출됨 : ${id}, ${password}, ${name}`);
    var user = new UserModel({"id":id, "password":password, "name": name});  // UserModel 인스턴스 생성
    user.save(function(err){  // 모델 (인스턴스) 객체 메소드(p.233) / save()를 호출하여 저장하면 비밀번호가 암호화된 후 hashed_password 속성에 저장된다. (save때문인지, virtual때문인지? 아마 virtual?)
        if(err){
            callback(err, null);
            return;
        }
        console.log(`사용자 데이터 추가함.`);
        callback(null, user);
    });
}

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

router.route('/process/addUser').post((req,res)=>{
    console.log('/process/addUser 호출됨.');
    let paramId = req.body.id || req.query.id,
        paramPassword = req.body.password || req.query.password,
        paramName = req.body.name || req.query.name;
    console.log(`요청 파라미터: ${paramId}, ${paramPassword}, ${paramName}`);

    if(myDatabase){
        addUser(myDatabase, paramId, paramPassword, paramName, function(err, result){
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

router.route('/process/listuser').post((req, res)=>{  // 사용자 리스트 조회 라우터
    console.log('/process/listuser 호출됨.');
    if(myDatabase){
        UserModel.findAll((err, results)=>{
            if(err){
                console.log(`사용자 리스트 조회 중 오류 발생: ${err.stack}`);
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 리스트 조회 중 오류 발생</h1>`);
                res.write(`<p>${err.stack}</p>`);
                res.end();
                return;
            }
            if(results){
                console.dir(results); 
                res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
                res.write(`<h1>사용자 리스트</h1>`);
                res.write(`<div><ul>`);
                for(let i = 0; i < results.length; i++){
                    let curId = results[i]._doc.id,
                        curName = results[i]._doc.name;
                    res.write(`     <li># ${i} : ${curId}, ${curName}`);
                }
                res.write('</ul></div>');
                res.end();
            }
        });
    } else{
        res.writeHead('200', {'Content-Type':'text/html;charset=utf8'});
        res.write(`<h1>데이터베이스 연결 실패</h1>`);
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