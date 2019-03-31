let express = require('express')
, bodyParser = require('body-parser')
, fs = require('fs')
, multer = require('multer');

let app = express();

var _storage = multer.diskStorage({
    destination: (req, file, cb)=>{  // 어느 디렉토리에 저장할 것인가?
      cb(null, 'files/');  // cb: 콜백함수. / if else 문을 사용하여 파일의 종류에 따라 다른 디렉토리에 저장할 수 있다.
    },
    filename: (req, file, cb)=>{  // 파일의 이름을 어떻게 할 것인가?
      cb(null, file.originalname);  // if else 문을 사용하여 파일의 종류에 따라 다른 이름으로 저장할 수 있다.
    }
});
let upload = multer({ storage: _storage });

app.use('/user', express.static('files'));  // 정적 뭐시기->../user/minju.jpg 로 파일에 접근 가능

app.use(bodyParser.urlencoded({ extended: false }));

app.locals.pretty = true;
app.set('views', './views');
app.set('view engine', 'jade');

app.get('/upload', (req, res)=>{
    res.render('uploadform');
});
app.post('/upload', upload.single('userfile'), (req,res)=>{  // upload.single(multer미들웨어): 사용자가 전송한 데이터 중 파일이 포함되어있다면 req.file이라는 객체를 추가.  input의 name값이 인자
    res.send('uploaded!' + req.file);
})

app.get('/topic/new', (req,res)=>{
    fs.readdir('uploads', (err, files)=>{
        if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
        }
        res.render('ex_temp', {filenames:files});
    });
});

app.get(['/topic', '/topic/:id'], (req,res)=>{
    fs.readdir('uploads', (err, files)=>{
        if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
        }
    
        let id = req.params.id;
        if(id){
            fs.readFile('uploads/'+id, 'utf-8', (err,data)=>{
                if(err){
                    console.log(err);
                    res.status(500).send('Internal Server Error');
                }
            
                res.render('ex_view1', {filenames:files, title:id, des:data});
            });
        }        
        else{
            res.render('ex_view1', {filenames:files, title:'File Title', des:'File Contents'});
        }    
    });
});

app.post('/topic', (req,res)=>{
    let title = req.body.title
    , des = req.body.des;
    fs.writeFile('uploads/'+title, des, (err)=>{
        if(err){
            console.log(err);
            res.status(500).send('Internal Server Error');
        }
        else res.send('file uploads success!');
    });
});

app.listen(3000, ()=>{
    console.log('3000번 서버가 연결되었습니다.');
});