var express = require('express');
var router = express.Router();
var mysql_dbc = require('../db/db_con')();
var connection = mysql_dbc.init();
var bcrypt = require('bcrypt');

router.post('/login', function (req, res, next) {
    var
        user_id = req.body.username,
        password = req.body.password;
    connection.query('select * from medic.user where user_id = ?', user_id, function (err, result) {
        if (err) {
            console.log('err :' + err);
        } else {
            if (result.length === 0) {
                res.json({ success: false, msg: '해당 유저가 존재하지 않습니다.' })
            } else {
                console.log(result[0].user_password);
                console.log(password);
                if (password != result[0].user_password) {
                    res.json({ success: false, msg: '비밀번호가 일치하지 않습니다.' })
                } else {
                    res.json({ success: true })
                }
            }
        }
    });
});
module.exports = router;