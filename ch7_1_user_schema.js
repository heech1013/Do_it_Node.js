const crypto = require('crypto');

let Schema = {};

Schema.createSchema = (mongoose)=>{  // mongoose 모듈 객체를 전달받기 위해 새로 함수를 정의한다.
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
    console.log('UserSchema 정의함.');
    
    return UserSchema;
};

module.exports = Schema;