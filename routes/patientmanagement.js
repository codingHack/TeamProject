var express = require('express');
var router = express.Router();
var mysql = require('mysql');
const isAuthenticated = require('../lib/isAuthenticated');
var conn = mysql.createConnection({
  host: 'newticker.iptime.org',
  port: '3308',
  user: 'web',
  password: 'mju12345',
  database: 'medic'
});
conn.connect();
const catchErrors = require('../lib/async-error');
const Nexmo = require('nexmo');
const nexmo = new Nexmo({
  apiKey: 'fe555087',
  apiSecret: 'qQjUJNdRH9wkYWl3'
});

function validateFormPatient(form, option) {
  var name = form.name || "";
  var phone_number = form.phone_number || "";
  var personal_number = form.personal_number || "";
  if (!name) { return "이름을 입력해주세요"; }
  if (!phone_number) { return "핸드폰 번호를 입력해주세요"; }
  if (phone_number.length != 11) { return "11자리의 핸드폰번호를 입력해주세요"; }
  if (!personal_number) { return "주민번호를 입력해주세요"; }
  if (personal_number.length != 13) { return "13자리의 주민번호를 입력해주세요"; }
}

function validateFormInpatient(form, option) {
  var bed_no = form.bed_no || "";
  var disease_name = form.disease_name || "";
  var hospital_day = form.hospital_day || "";
  if (!bed_no) { return "침대 번호를 입력해주세요!"; }
  if ((bed_no < 1) && (bed_no > 16)) { return "1~16 침대 번호만 입력해주세요!" }
  if (!disease_name) { return "질병을 입력해주세요!"; }
  if (!hospital_day) { return "입원일을 설정해주세요!"; }
}

function validateFormDetail(form, option) {
  var employee_id = form.employee_id || "";
  var date = form.date || "";
  var description = form.description || "";
  if (!employee_id) { return "담당자를 입력해주세요!"; }
  if (!date) { return "날짜 입력해주세요!"; }
  if (!description) { return "내용을 입력해주세요!"; }

}

function getSqlResult(insertSql, callback) {
  conn.query(insertSql, function (err, result) {
    if (err)
      callback(err, null);
    else
      callback(null, result);
  });
}

function getPersonResult(personList, data) {
  for (var i in data) {
    var person = {
      'name': data[i].name,
      'personal_number': data[i].personal_number,
      'phone_number': data[i].phone_number,
      'gender': data[i].gender,
      'patient_id': data[i].patient_id
    }
    personList.push(person);
  }
  return personList;
}

function formatDate(date) {
  var d = new Date(date),
    month = '' + (d.getMonth() + 1),
    day = '' + d.getDate(),
    year = d.getFullYear();

  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;

  return [year, month, day].join('-');
}

//환자관리 눌렀을 때 보여주는곳+ 환자 검색 (완)
router.get('/', isAuthenticated, catchErrors(async (req, res, next) => {
  if (req.query.name) {
    var insertSql = "SELECT * FROM patient WHERE name ='" + req.query.name + "'";
  } else {
    var insertSql = "SELECT * FROM patient"
    //var insertSql="DELETE FROM surgery_schedule WHERE patient_id='46'";
    //var insertSql="UPDATE bed SET inpatient_id ='46' WHERE bed_id=1";
    //var insertSql="INSERT INTO medical_record (patient_id, doctor_id, date, disease, description, precaution) VALUES ('34','1','2018-07-20','정신병','정신약 처방','하루 한알만')";
  }
  var personList = [];
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
    } else {
      personList = getPersonResult(personList, data);
      res.render('patientmanagement/list', { patients: personList, count_patient: data.length, role: res.locals.currentUser.user_role });
    }
  });
}));

//입원환자 침대 현황 (완)
router.get('/bed/:number', isAuthenticated, catchErrors(async (req, res, next) => {
  var number = req.params.number;
  var bedList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  var patientList = [];
  if (number == '1') {
    var insertSql = "SELECT bed_id, inpatient_id FROM bed WHERE (bed_id>=1)AND(bed_id<=16)";
    var insertSql2 = "SELECT* FROM medic.inpatient_view WHERE (bed_no>=1)AND(bed_no<=16) ORDER BY bed_no";
    number = "안과";
  } else if (number == '2') {
    var insertSql = "SELECT bed_id, inpatient_id FROM bed WHERE (bed_id>=17)AND(bed_id<=32)";
    var insertSql2 = "SELECT* FROM medic.inpatient_view WHERE (bed_no>=17)AND(bed_no<=32) ORDER BY bed_no";
    number = "내과";
  } else if (number == '3') {
    var insertSql = "SELECT bed_id, inpatient_id FROM bed WHERE (bed_id>=33)AND(bed_id<=48)";
    var insertSql2 = "SELECT* FROM medic.inpatient_view WHERE (bed_no>=33)AND(bed_no<=48) ORDER BY bed_no";
    number = "외과";
  } else if (number == '4') {
    var insertSql = "SELECT bed_id, inpatient_id FROM bed WHERE (bed_id>=49)AND(bed_id<=64)";
    var insertSql2 = "SELECT* FROM medic.inpatient_view WHERE (bed_no>=49)AND(bed_no<=64) ORDER BY bed_no";
    number = "치과";
  }
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
    } else {
      for (var i in data) {
        if (data[i].inpatient_id > 0) {
          var bbb = parseInt(data[i].bed_id) % 16;
          if (bbb == 0) {
            bbb = 16;
          }
          bedList[bbb - 1] = 1;
        }
      }
      getSqlResult(insertSql2, function (err, data) {
        if (err) {
          console.log("ERROR : ", err);
        } else {
          for (var i in data) {
            var patient = {
              'department_name': data[i].department_name,
              'bed_no': parseInt(data[i].bed_no) % 16,
              'patient_id': data[i].patient_id,
              'patient_name': data[i].name,
              'employee_id': data[i].employee_id,
              'employee_name': data[i].doctor_name,
              'personal_number': data[i].personal_number,
              'disease_name': data[i].disease_name,
              'hospital_day': data[i].hospital_day
            }
            if (patient.bed_no == 0) {
              patient.bed_no = 16;
            }
            patient.personal_number = patient.personal_number.substring(0, 6);
            patientList.push(patient);
          }
        }
        res.render('patientmanagement/bed', { bedList: bedList, patientList: patientList, number: number, role: res.locals.currentUser.user_role });
      });
    }
  });
}));

//입원 클릭했을시 입원수속 보여주는곳 (완)
router.get('/inpatient/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var insertSql = 'SELECT patient_id FROM inpatient WHERE patient_id=' + req.params.id;
  getSqlResult(insertSql, function (err, data) {
    if (data.length == 1) {
      req.flash('danger', "이미 입원중인 환자입니다.");
      return res.redirect('back');
    } else {
      var person = [];
      var bedList = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      var doctorList1 = [];
      var doctorList2 = [];
      var doctorList3 = [];
      var doctorList4 = [];
      var requestPatient = req.params.id;
      var insertSql2 = 'SELECT * FROM patient WHERE patient_id=' + requestPatient;
      var insertSql3 = "SELECT bed_id, inpatient_id FROM bed";
      var insertSql4 = "SELECT * FROM medic.doctor_view";
      getSqlResult(insertSql4, function (err, data) {
        if (err) {
          console.log("ERROR : ", err);
        } else {
          for (var i in data) {
            var doctor = {
              'employee_id': data[i].employee_id,
              'name': data[i].name,
              'department_name': data[i].department_name
            }
            switch (doctor.department_name) {
              case '안과':
                doctorList1.push(doctor);
                break;
              case '내과':
                doctorList2.push(doctor);
                break;
              case '외과':
                doctorList3.push(doctor);
                break;
              case '치과':
                doctorList4.push(doctor);
                break;
              default:
            }
            //console.log(doctor);
          }
        }
      });
      getSqlResult(insertSql2, function (err, data) {
        if (err) {
          console.log("ERROR : ", err);
        } else {
          person = getPersonResult(person, data);
          getSqlResult(insertSql3, function (err, data) {
            if (err) {
              console.log("ERROR : ", err);
            } else {
              console.log(data);
              for (var i in data) {
                if (data[i].inpatient_id > 0) {
                  bedList[data[i].bed_id - 1] = 1;
                }

              }
              console.log(bedList);
              res.render('patientmanagement/inpatient', { patient: person[0], bedList: bedList, doctorList1: doctorList1, doctorList2: doctorList2, doctorList3: doctorList3, doctorList4: doctorList4, role: res.locals.currentUser.user_role });
            }
          });
        }
      });
    }
  });
}));

//입원 수속 완료후 입원 추가 (완)
router.post('/inpatient/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  const err = validateFormInpatient(req.body);
  if (err) {
    req.flash('danger', err);
    console.log(err);
    return res.redirect('back');
  }

  var patient_id = req.params.id;
  var department = req.body.department;
  var bed_no = req.body.bed_no;
  if (department == "option1") {
    var doctor_employee_id = req.body.doctor_employee_id1;
    console.log(doctor_employee_id);
  } else if (department == "option2") {
    bed_no = 16 + parseInt(bed_no);
    var doctor_employee_id = req.body.doctor_employee_id2;
    console.log(doctor_employee_id);
  } else if (department == "option3") {
    bed_no = 32 + parseInt(bed_no);
    var doctor_employee_id = req.body.doctor_employee_id3;
    console.log(doctor_employee_id);
  } else {
    bed_no = 48 + parseInt(bed_no);
    var doctor_employee_id = req.body.doctor_employee_id4;
    console.log(doctor_employee_id);
  }
  var hospital_room = parseInt((parseInt(bed_no) - 1) / 4) + 1;
  var disease_name = req.body.disease_name;
  var hospital_day = req.body.hospital_day;
  var insertSql = "SELECT inpatient_id FROM bed WHERE bed_id = " + bed_no;
  var insertSql2 = "INSERT INTO inpatient (patient_id, hospital_room, bed_no, disease_name, doctor_employee_id, hospital_day) VALUES ('" + patient_id + "','" + hospital_room + "','" + bed_no + "','" + disease_name + "','" + doctor_employee_id + "','" + hospital_day + "')";
  var insertSql3 = "UPDATE bed SET inpatient_id=" + patient_id + ", weight_sensor=" + 0 + ", is_wet=" + 0 + ", is_empty=" + 0 + " WHERE (bed_id='" + bed_no + "') AND ( hospital_room='" + hospital_room + "')";
  getSqlResult(insertSql, function (err, data) {
    if ((data[0].inpatient_id) != null) {
      req.flash('danger', "사용중인 침대입니다.");
      return res.redirect('back');
    }
    getSqlResult(insertSql2, function (err, data) {
      if (!err) {
        getSqlResult(insertSql3, function (err, data) {
          if (!err) {
            req.flash('success', "추가 성공");
          }
        });
      }
      return res.redirect('/patientmanagement');
    });
  });
}));

//입원 수속에서 상세정보 클릭 (완)
router.get('/inpatientdetail/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var insertSql = "SELECT * FROM medic.usage_record_view WHERE patient_id  = " + req.params.id + " ORDER BY record_id DESC";
  var recordList = [];
  getSqlResult(insertSql, function (err, data) {
    if (!err) {
      for (var i in data) {
        var record = {
          'record_id': data[i].record_id,
          'name': data[i].name,
          'date': data[i].date,
          'information': data[i].information,
          'description': data[i].description
        }
        recordList.push(record);
      }
      res.render('patientmanagement/patient_record', { recordList: recordList, patient_id: req.params.id, role: res.locals.currentUser.user_role });
    }
  });
}));

//입원 중인 환자 투약, 링거, 기저귀 변경내용 추가눌렀을 경우(완)
router.get('/inpatientdetail/new/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var patient_id = req.params.id;
  var nurseDepartment;
  var nurseList = [];
  var insertSql = "SELECT bed_no FROM inpatient WHERE patient_id  =" + patient_id;
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
    } else {
      nurseDepartment = data[0].bed_no;
      if ((nurseDepartment >= 1) && (nurseDepartment <= 16)) {
        nurseDepartment = '안과';
      } else if ((nurseDepartment >= 17) && (nurseDepartment <= 32)) {
        nurseDepartment = '내과';
      } else if ((nurseDepartment >= 33) && (nurseDepartment <= 48)) {
        nurseDepartment = '외과';
      } else {
        nurseDepartment = '치과';
      }
      var insertSql2 = "SELECT * FROM medic.nurse_view WHERE department_name = '" + nurseDepartment + "'";
      getSqlResult(insertSql2, function (err, data) {
        if (err) {
          console.log("ERROR : ", err);
        } else {
          for (var i in data) {
            var nurse = {
              'employee_id': data[i].employee_id,
              'name': data[i].name,
              'department_name': data[i].department_name
            }
            nurseList.push(nurse);
            console.log(nurse);
          }
        }
        res.render('patientmanagement/newpatient_record', { patient_id: patient_id, nurseList: nurseList, role: res.locals.currentUser.user_role });
      });
    }
  });
}));

//입원 중인 환자 투약, 링거, 기저귀 변경내용 추가하기(완)
router.post('/inpatientdetail/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  const err = validateFormDetail(req.body);
  if (err) {
    req.flash('danger', err);
    console.log(err);
    return res.redirect('back');
  }
  var patient_id = req.params.id;
  var employee_id = req.body.employee_id;
  var date = req.body.date;
  var information = req.body.information;
  console.log(information);
  if (information == 'option1') {
    information = "링거";
  } else if (information == 'option2') {
    information = "기저귀";
  } else {
    information = "투약";
  }
  var description = req.body.description;
  var insertSql = "INSERT INTO usage_record (patient_id, employee_id, date, information, description) VALUE ('" + patient_id + "','" + employee_id + "','" + date + "','" + information + "','" + description + "')";
  getSqlResult(insertSql, function (err, data) {
    if (!err) {
      req.flash('success', "추가 성공!");
    }
  });
  res.redirect(req.params.id);
}));

//퇴원 수속 (완)
router.delete('/inpatient/:id', isAuthenticated, catchErrors(async (req, res, next) => {
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
  var insertSql = "SELECT * FROM inpatient WHERE patient_id = " + req.params.id;
  getSqlResult(insertSql, function (err, data) {
    if (data.length >= 1) {
      var doctor_id = data[0].doctor_employee_id;
      var hospital_day = formatDate(data[0].hospital_day);
      var disease_name = data[0].disease_name;
      var department_id = data[0].bed_no;
      if ((department_id >= 1) && (department_id <= 16)) {
        department_id = 1;
      } else if ((department_id >= 17) && (department_id <= 32)) {
        department_id = 2;
      } else if ((department_id >= 33) && (department_id <= 48)) {
        department_id = 3;
      } else {
        department_id = 4;
      }
      var insertSql2 = "UPDATE bed SET inpatient_id = null ,weight_sensor=0, is_wet=0, is_empty=0 WHERE inpatient_id = " + req.params.id;
      var insertSql3 = "DELETE FROM surgery_schedule WHERE patient_id=" + req.params.id;
      var insertSql4 = "DELETE FROM inpatient WHERE patient_id = " + req.params.id;
      var insertSql5 = "INSERT INTO hospital_record ( patient_id, doctor_id, department_id, disease_name, hospital_day, discharge_day) VALUES ('" + req.params.id + "','" + doctor_id + "','" + department_id + "','" + disease_name + "','" + hospital_day + "','" + today + "' )";
      
      getSqlResult(insertSql2, function (err, data) {
        if (!err) {
          getSqlResult(insertSql3,function(err,data){
            getSqlResult(insertSql4, function (err, data) {
              if (!err) {
                getSqlResult(insertSql5, function (err, data) {
                  if (!err) {
                    req.flash('success', "퇴원 성공!");
                    res.redirect('back');
                  } else {
                    console.log(err);
                    req.flash('danger', "퇴원 불가!");
                    res.redirect('back');
                  }
                });
              } else {
                req.flash('danger', "퇴원 불가!");
                res.redirect('back');
              }
            });
          });
        } else {
          req.flash('danger', "퇴원 불가!");
          res.redirect('back');
        }
      });
    } else {
      req.flash('danger', "입원한 환자가 아닙니다!");
      res.redirect('back');
    }
  });
}));

//퇴원 기록 확인(완)
router.get('/outpatient', isAuthenticated, catchErrors(async (req, res, next) => {
  var insertSql = "SELECT * FROM medic.hospital_record_view";
  var recordList = [];
  getSqlResult(insertSql, function (err, data) {
    if (!err) {
      for (var i in data) {
        var record = {
          'department_name': data[i].department_name,
          'patient_id': data[i].patient_id,
          'name': data[i].name,
          'personal_number': data[i].personal_number,
          'doctor_name': data[i].doctor_name,
          'disease_name': data[i].disease_name,
          'hospital_day': data[i].hospital_day,
          'discharge_day': data[i].discharge_day,
        }
        record.personal_number = (record.personal_number).substring(0, 6);
        recordList.push(record);
      }
      res.render('patientmanagement/outpatient', { recordList: recordList, role: res.locals.currentUser.user_role });
    }
  });
}));

//상세보기를 눌렀을 경우 보여주는곳 (완)
router.get('/show/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var person = [];
  var recordList = [];
  var requestPatient = req.params.id;
  var insertSql = 'SELECT * FROM patient WHERE patient_id=' + requestPatient;
  var insertSql2 = 'SELECT * FROM medic.medical_record_view WHERE patient_id=' + requestPatient;
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
    } else {
      person = getPersonResult(person, data);
      getSqlResult(insertSql2, function (err, data) {
        if (err) {
          console.log("ERROR : ", err);
        } else {
          for (var i in data) {
            var record = {
              'name': data[i].name,
              'date': data[i].date,
              'disease': data[i].disease,
              'description': data[i].description,
              'precaution': data[i].precaution
            }
            recordList.push(record);
          }
          res.render('patientmanagement/show', { patient: person[0], recordList: recordList, role: res.locals.currentUser.user_role });
        }
      });
    }
  });
}));

//문자보내기 (완)
router.post('/send/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var insertSql = "SELECT phone_number FROM patient WHERE patient_id = " + req.params.id;
  var NUMBER;
  getSqlResult(insertSql, function (err, data) {
    if (!err) {
      NUMBER = data[0].phone_number;
      NUMBER = NUMBER.substring(1, 11);
      var TO_NUMBER = '82' + NUMBER;
      console.log(TO_NUMBER);
      const from = 'Nexmo';
      const to = TO_NUMBER;
      const text = req.body.textSMS;
      if (text.length == 0) {
        req.flash('danger', "내용을 입력해주세요");
        return res.redirect('back');
      }
      console.log("text:" + text);
      nexmo.message.sendSms(from, to, text, (error, response) => {
        if (error) {
          throw error;
        } else if (response.messages[0].status != '0') {
          console.error(response);
          throw 'Nexmo returned back a non-zero status';
        } else {
          console.log(response);
        }
      });
      req.flash('danger', "보내기 성공!");
      res.redirect('back');
    }
  });
}));

//환자 추가눌렀을 때 (완)
router.get('/new', isAuthenticated, catchErrors(async (req, res, next) => {
  res.render('patientmanagement/new', { role: res.locals.currentUser.user_role });
}));

//환자 추가를 했을 때 (완)
router.post('/new', isAuthenticated, catchErrors(async (req, res, next) => {
  const err = validateFormPatient(req.body);
  if (err) {
    req.flash('danger', err);
    console.log(err);
    return res.redirect('back');
  }
  var name = req.body.name;
  var phone_number = req.body.phone_number;
  var personal_number = req.body.personal_number;
  var gender = 0;
  if (req.body.gender != 'option1') { gender = 1; }
  var insertSql = "INSERT INTO patient (name, phone_number, personal_number, gender) VALUES ('" + name + "','" + phone_number + "','" + personal_number + "','" + gender + "')";
  getSqlResult(insertSql, function (err, data) {
    if (!err) {
      req.flash('success', '추가 완료!');
    }
    return res.redirect('/patientmanagement');
  });
}));

//환자 정보 변경 눌렀을 경우 (완)
router.get('/edit/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var person = [];
  var requestPatient = req.params.id;
  var insertSql = 'SELECT * FROM patient WHERE patient_id=' + requestPatient;
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
    } else {
      req.flash('success', "추가 성공");
      person = getPersonResult(person, data);
      res.render('patientmanagement/edit', { patient: person[0], role: res.locals.currentUser.user_role });
    }
  });
}));

//환자 정보 변경 했을 경우 (완)
router.put('/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  console.log(req.body);
  const err = validateFormPatient(req.body);
  if (err) {
    req.flash('danger', err);
    console.log(err);
    return res.redirect('back');
  }
  var patient_id = req.params.id;
  var name = req.body.name;
  var phone_number = req.body.phone_number;
  var personal_number = req.body.personal_number;
  var gender = 0;
  if (req.body.gender = 'female') { gender = 1; }
  var insertSql = "UPDATE patient SET name='" + name + "', personal_number='" + personal_number + "', phone_number='" + phone_number + "', gender=" + gender + " WHERE patient_id=" + patient_id;
  console.log(insertSql);
  getSqlResult(insertSql, function (err, data) {
    if (err) {
      console.log("ERROR : ", err);
      req.flash('success', "변경 실패");
    } else {
      req.flash('success', "변경 성공");
      res.redirect('/patientmanagement');
    }
  });
}));

//환자 정보를 삭제 (완)
router.delete('/:id', isAuthenticated, catchErrors(async (req, res, next) => {
  var insertSql1 = "SELECT * FROM inpatient WHERE patient_id=" + req.params.id;
  var insertSql2 = "DELETE FROM hospital_record WHERE patient_id=" + req.params.id;
  var insertSql3 = "DELETE FROM usage_record WHERE patient_id=" + req.params.id;
  var insertSql4 = "DELETE FROM medical_record WHERE patient_id=" + req.params.id;
  var insertSql5 = "DELETE FROM surgery_schedule WHERE patient_id=" + req.params.id;
  var insertSql6 = "DELETE FROM patient WHERE patient_id = " + req.params.id;
  console.log("1:"+insertSql1);
  console.log("2:"+insertSql2);
  console.log("3:"+insertSql3);
  console.log("4:"+insertSql4);
  console.log("5:"+insertSql5);
  console.log("6:"+insertSql6);
  getSqlResult(insertSql1, function (err, data) {
    if (data.length >= 1) {
      req.flash('danger', "입원중인 환자는 삭제할수 없습니다!");
      return res.redirect('back');
    }
    getSqlResult(insertSql2, function (err, data) {
      if(err){
        console.log("ERROR : ", err);
      }
      getSqlResult(insertSql3, function (err, data) {
        if(err){
          console.log("ERROR : ", err);
        }
        getSqlResult(insertSql4, function (err, data) {
          if(err){
            console.log("ERROR : ", err);
          }
          getSqlResult(insertSql5, function (err, data) {
            if(err){
              console.log("ERROR : ", err);
            }
            getSqlResult(insertSql6, function (err, data) {
              if (err) {
                console.log("ERROR : ", err);
                req.flash('success', "삭제 실패");
              }
              req.flash('success', "삭제 완료");
              res.redirect('/patientmanagement');
            });
          });
        });
      });
    });
  });
}));

module.exports = router;
