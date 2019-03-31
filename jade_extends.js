const express = require('express');

const exp = express();

exp.set('view engine', 'jade');
exp.set('views', 'jade');

exp.get('/view', (req, res)=>{
    res.render('view');
});

exp.get('/add', (req, res)=>{
    res.render('add');
});

exp.listen(3000, ()=>{
    console.log('3000번 포트가 연결되었습니다.');
});