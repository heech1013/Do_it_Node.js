const express = require('express');
const exp = express();

var router_p1 = require('./routes/p1')(exp);
exp.use('/p1', router_p1);  

var router_p2 = require('./routes/p2')(exp);
exp.use('/p2', router_p2);

exp.listen(3000, ()=>{
    console.log('3000번 포트가 연결되었습니다.');
});