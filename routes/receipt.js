var express = require('express');
var router = express.Router();
const catchErrors = require('../lib/async-error');
const isAuthenticated = require('../lib/isAuthenticated');
var mysql_dbc = require('../db/db_con')();
var conn = mysql_dbc.init();

function getSqlResult(insertSql, callback) {
    conn.query(insertSql, function (err, result) {
        if (err)
            callback(err, null);
        else
            callback(null, result);
    });
}

function validateFormReceipt(form, option) {
    var patient_id = form.patient_id || "";
    var doctor_id = form.doctor_id || "";
    var date = form.date || "";
    var disease = form.disease || "";
    var description = form.description || "";
    var medicine_id = form.medicine_id || "";
    var amount = form.amount || "";
    var frequency = form.frequency || "";
    var precaution = form.precaution || "";

    if (!patient_id) { return "환자 번호를 입력해주세요!"; }
    if (!doctor_id) { return "담당의사 번호를 입력해주세요!"; }
    if (!date) { return "날짜를 입력해주세요!"; }
    if (!disease) { return "질병 이름을 입력해주세요!"; }
    if (!description) { return "진료 내용를 입력해주세요!"; }
    if (!medicine_id) { return "약 번호를 입력해주세요!"; }
    if (!amount) { return "약의 양를 입력해주세요!"; }
    if (!frequency) { return "약 복용횟수를 입력해주세요!"; }
    if ((patient_id < 0) || (doctor_id < 0) || (medicine_id < 0) || (amount < 0) || (frequency < 0)) { return "0이상의 수를를 입력해주세요!"; }
    if (!precaution) { return "주의사항을 입력해주세요!"; }
}

function getDate() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    if (dd < 10) {
        dd = '0' + dd
    }
    if (mm < 10) {
        mm = '0' + mm
    }
    today = yyyy + '-' + mm + '-' + dd;
    return today;
}

function getDeptName(dept_id) {
    if (dept_id == 1) return '안과';
    else if (dept_id == 2) return '내과';
    else if (dept_id == 3) return '외과';
    else if (dept_id == 4) return '치과';
    return 'error';
}


//진료 접수 메인 페이지
router.get('/', isAuthenticated, catchErrors(async (req, res, next) => {
    var date = getDate();
    var sql = "SELECT * FROM medic.employee where employee_id=" + res.locals.currentUser.user_information;
    await conn.query(sql, function (err, result) {
        if (err)
            console.log('Error while performing Query.', err);
        else {

            var doc = {
                dept_id: result[0].department_id - 1,
                name: result[0].name,
                department: getDeptName(result[0].department_id)
            }
            console.log(result);
            res.render('receipt/receiptmain', { doc: doc, date: date, role: res.locals.currentUser.user_role });
        }
    })
}));

//리스트에서 진료접수로 넘어왔을 경우 메인 페이지
router.get('/:patient_id', catchErrors(async (req, res, next) => {
    var patient_id = req.params.patient_id;
    var date = getDate();
    var doc;
    var patient;
    var sql = "SELECT * FROM medic.employee where employee_id=" + res.locals.currentUser.user_information;
    await conn.query(sql, function (err, result) {
        if (err)
            console.log('Error while performing Query.', err);
        else {
            doc = {
                dept_id: result[0].department_id - 1,
                name: result[0].name,
                department: getDeptName(result[0].department_id)
            }
        }
    })
    sql = "SELECT * FROM medic.patient where patient_id=" + patient_id;
    await conn.query(sql, function (err, result) {
        if (err)
            console.log('Error while performing Query.', err);
        else {
            patient = {
                name: result[0].name,
                patient_id: patient_id
            }
        }
    })
    //patient_id로 patient_name얻은 다음 patient로 render에 보내고
    res.render('receipt/receiptmain', { doc: doc, patient: patient, date: date, role: res.locals.currentUser.user_role });
}));

//진료기록 작성 완료
router.post('/:id', catchErrors(async (req, res, next) => {
    const err = validateFormReceipt(req.body);
    if (err) {
        req.flash('danger', err);
        console.log(err);
        return res.redirect('back');
    }
    var patient_id = req.body.patient_id;
    var doctor_id = res.locals.currentUser.user_information;
    var date = req.body.date;
    var disease = req.body.disease;
    var description = req.body.description;
    var precaution = req.body.precaution;
    var insertSql = "INSERT INTO medical_record (patient_id, doctor_id, date, disease, description, medicine_id, amount, frequency, precaution ) VALUES('" + patient_id + "','" + doctor_id + "','" + date + "','" + disease + "','" + description + "','" + medicine_id + "','" + amount + "','" + frequency + "','" + precaution + "')";
    getSqlResult(insertSql, function (err, date) {
        if (!err) {
            req.flash('success', "추가 성공");
        }
        res.redirect('receipt/receiptmain');
    });
}));

module.exports = router;
