//jshint esversion=6

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const atob = require('atob');
const knex = require('knex');
const bcrypt = require('bcrypt');
const jws = require('jws');
const saltRounds = 12;

const db = knex({
    client: 'mysql',
    connection: {
        host: 'localhost',
        user: 'root',
        password: 'password',
        database: 'ssael_usersplantmaintenance',
    }
});

app.use(bodyParser.json());
app.use(cors());

app.get("/", function (req, res) {
    res.send("<h1>Helloo123</h1>");
});

app.post("/signin", function (req, res) {
    const {username, password} = req.body;
    let newSeed = username + password;
    const token = jws.sign({
        header: {alg: 'HS256'},
        payload: newSeed,
        secret: 'ssael@123',
    });
    db.select('pass').from('clientlogin').where('uid', '=', username)
        .then(
            data => {
                const isValid = bcrypt.compareSync(password, data[0].pass);
                if (isValid) {
                    db.select('*').from('clientlogin').where('uid', '=', username).then(dat => {
                        res.status(200).json({
                            token: token,
                            status: 'success',
                            body: dat,
                        })
                    });
                } else {
                    res.status(400).json({
                        "status": "Error Logging in!"
                    });
                }
            }
        )
});


app.post('/register-user', function (req, res) {
    const {fname, role, email, uid, plants, password} = req.body;
    const hash = bcrypt.hashSync(password, saltRounds);
    db('login').insert({
        pass: hash,
        uid: uid
    }).then(resp => {
        db('clientlogin').insert({
            fname: fname,
            role: role,
            email: email,
            uid: uid,
            plants: plants
        }).then(resp => {
            res.json({
                status: "success",
            });
        })
    });
});


app.post('/create-cycle', function (req, res) {
    const {plant, startToday, duration, year, cycle} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const date = new Date();
    let dateq = "";
    if (startToday) {
        dateq = dateq + date.getFullYear().toString() + "-";
        dateq = dateq + (date.getMonth() + 1).toString() + "-";
        dateq += date.getDate().toString();
    }
    plnt.select('*').from('cycledata')
        .then(data1 => {
            plnt('cycledata').insert({
                contractyear: year,
                startdate: dateq,
                duration: duration,
            }).then(resp => {
                plnt('cycledata').where('startdate', '=', dateq).update({
                    cyclenum: cycle,
                })
                    .then(let => {
                        plnt.select('*').from('cycledata')
                            .then(dat => {
                                let q = new Date(dat[dat.length - 1].startdate);
                                let year = q.getFullYear();
                                const name1 = 'cleanstatuscontract' + year.toString() + 'cycle' + cycle.toString();
                                plnt.schema.createTable(name1, table => {
                                    table.increments('id');
                                    table.integer('zone');
                                    table.string('blockname');
                                    table.integer('row_num');
                                    table.string('inverter');
                                    table.string('smb');
                                    table.boolean('_40mod');
                                    table.boolean('_cleanstatus').defaultTo(false);
                                    table.date('updateDate').nullable().defaultTo(null);
                                    table.time('updateTime').nullable().defaultTo(null);
                                    table.specificType('precleanimage', 'longblob').defaultTo(null);
                                    table.specificType('postcleanimage', 'longblob').defaultTo(null);
                                    table.string('comments').nullable().defaultTo('');
                                })
                                    .then(resf => {
                                        let a = new Date();
                                        let Time = a.getHours() + ':' + a.getMinutes() + ':' + a.getSeconds();
                                        let Date1 = a.getFullYear() + '-' + ('0' + (a.getMonth() + 1)).slice(-2) + '-' + ('0' + a.getDate()).slice(-2);
                                        db('data').select('*')
                                            .then(resq => {
                                                for (let i = 0; i < resq.length; i++) {
                                                    for (let j = 0; j < resq[i].totalrows; j++) {
                                                        if (j < resq[i]._40mrows) {
                                                            plnt(name1).insert({
                                                                zone: resq[i].zone,
                                                                blockname: resq[i].blockname,
                                                                row_num: j + 1,
                                                                inverter: resq[i].inverter,
                                                                smb: resq[i].smb,
                                                                _40mod: true,
                                                                updateDate: Date1,
                                                                updateTime: Time,
                                                                precleanimage: '',
                                                                postcleanimage: ''
                                                            }).then(ged => console.log(" "));
                                                        } else {
                                                            plnt(name1).insert({
                                                                zone: resq[i].zone,
                                                                blockname: resq[i].blockname,
                                                                row_num: j + 1,
                                                                inverter: resq[i].inverter,
                                                                smb: resq[i].smb,
                                                                _40mod: false,
                                                                updateDate: Date1,
                                                                updateTime: Time,
                                                                precleanimage: '',
                                                                postcleanimage: ''
                                                            }).then(red => console.log(' '));
                                                        }
                                                    }
                                                }
                                            })
                                    })
                            })
                    })
            })
        }).then(red => res.json("Success"));
});

app.post('/check-cycle', function (req, res) {
    const {plant} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    plnt.select('*').from('cycledata')
        .then(resp => {
            let last = resp.length;
            let startdate = new Date(resp[last - 1].startdate);
            let endDate = startdate.addDays(resp[last - 1].duration);
            let endDatefinal = endDate.getFullYear() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + ('0' + endDate.getDate()).slice(-2);
            let contractyear = resp[last - 1].contractyear;
            res.json({
                body: resp[last - 1].complete,
                endDate: endDatefinal,
                contractyear: contractyear,
            });
        });
});

app.post('/get-cycle-data', function (req, res) {
    const {plant} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    plnt.select('*').from('cycledata')
        .then(resp => {
            let last = resp.length;
            let startdate = new Date(resp[last - 1].startdate);
            let startdatefinal = startdate.getFullYear() + '-' + ('0' + (startdate.getMonth() + 1)).slice(-2) + '-' + ('0' + startdate.getDate()).slice(-2);
            let endDate = startdate.addDays(resp[last - 1].duration);
            let endDatefinal = endDate.getFullYear() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + ('0' + endDate.getDate()).slice(-2);
            let currentCycle = resp[last - 1].cyclenum;
            res.json({
                status : 'Success',
                startdate: startdatefinal,
                endDate: endDatefinal,
                currentCycle: currentCycle,
                duration: resp[last - 1].duration,
                contractyear: resp[last - 1].contractyear,
            })
        })
        .catch(err => res.json({status:'Cannot Find the Cycle data for this plant'}));
});

app.post('/rowstats', function (req, res) {
    const {plant, year, zone, row, block, inverter, SMB, cycle} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const promisearray = [];
    for (let i = 0; i < cycle; i++) {
        let table = "cleanstatuscontract" + year.toString() + "cycle" + (i + 1).toString();
        promisearray.push(plnt(table).where({
            'zone': zone,
            'row_num': row,
            'blockname': block,
            'inverter': inverter,
            'smb': SMB
        })
            .select('_cleanstatus', '_40mod', 'updateDate', 'updateTime'));
    }

    const b = [];
    Promise.all(promisearray.map((promise, i) => {
            return promise.then(resp => {
                let date = new Date(resp[0].updateDate);
                let updateDatefinal = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) +
                    '-' + ('0' + date.getDate()).slice(-2);
                b.push({
                    cycle: i + 1,
                    _cleanstatus: resp[0]._cleanstatus,
                    _40mod: resp[0]._40mod,
                    updateDate: updateDatefinal,
                    updateTime: resp[0].updateTime
                })
            }).catch(err => res.json({
                status: 'Error',
                body: 'Cannot Find ANY DATA regarding the Row'
            }));
        })
    ).then(hello => {
        b.sort(function (a, c) {
            return a.cycle - c.cycle;
        });
        res.json({
            status: 'Success',
            body: b
        });
    });
});

app.post('/getplant', function (req, res) {
    const {plant, startdate, presentDate, cycle, year} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const datatable = plant + 'data';
    let date = new Date(startdate);
    let date1 = new Date(presentDate);
    let date12 = [];
    const response = [];
    const promisearray = [];
    let table = "cleanstatuscontract" + year.toString() + "cycle" + cycle.toString();
    for (let i = 0; i <= ((date1 - date) / (24 * 60 * 60 * 1000)); i++) {
        let date2 = date.addDays(i);
        date12.push(date2.getFullYear() + '-' + ('0' + (date2.getMonth() + 1)).slice(-2) + '-' + ('0' + date2.getDate()).slice(-2));
        promisearray.push(plnt(table).select('_40mod').where({
            '_cleanstatus': true,
            'updateDate': date12[date12.length - 1]
        }));
    }
    Promise.all(promisearray.map((promise, i) => {
        return promise.then(rsp => {
            const fortyrows = rsp.filter(mod => mod['_40mod'] == true);
            const twentyrows = rsp.filter(mod => mod['_40mod'] == false);
            const total_cleaned = fortyrows.length * 40 + twentyrows.length * 20;
            response.push({
                date: date12[i],
                today_cleaned: total_cleaned,
            });
        })
            .catch(err => res.json({status: 'Error finding the Table'}));
    })).then(hello => {
            plnt(datatable).sum('totalmodules').then(bro => res.json({
                status: 'Success',
                data: response,
                totalmodules: bro[0]['sum(`totalmodules`)'],
            }))
                .catch(err => res.json({
                    status: 'Error finding the data table for the plant. Please update the data table for the selected Plant',
                    data: []
                }))
        }
    );
});

app.post('/getplantonparticulardate', function (req, res) {
    const {plant, presentDate, cycle} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    let date = new Date(presentDate);
    let table = "cleanstatuscontract" + date.getFullYear().toString() + "cycle" + cycle.toString();
    plnt(table).select('_40mod').where('_cleanstatus', true).andWhere(function () {
        this.where('updateDate', '=', presentDate)
    }).then(rsp => {
        let len = rsp.length;
        const fortyrows = rsp.filter(mod => mod['_40mod'] == true);
        const twentyrows = rsp.filter(mod => mod['_40mod'] == false);
        const total_cleaned = fortyrows.length * 40 + twentyrows.length * 20;
        plnt(table).select('*').then(resp => {
            const fortyrows = resp.filter(mod => mod['_40mod'] == true);
            const twentyrows = resp.filter(mod => mod['_40mod'] == false);
            const total_rows = fortyrows.length * 40 + twentyrows.length * 20;
            res.json({
                total_cleaned_today: total_cleaned,
            });
        })
    })
});

app.post('/getnumrows', function (req, res) {
    const {zone, plant, block, inverter, smb} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const datatable = plant + 'data';
    plnt(datatable).select('totalrows').where({
        'zone': zone,
        'blockname': block,
        'inverter': inverter,
        'smb': smb
    }).then(resp => {
        res.json({
            rows: resp[0].totalrows,
        })
    });
});

app.post('/zonedata', function (req, res) {
    const {plant} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const zonetable = plant + 'zone';
    plnt(zonetable).select('*').then(resp => {
        res.json({
            status: "Success",
            body: resp
        });
    })
        .catch(err => res.json({status: 'No Table for the Zone Data is Found.Please Update It.'}));
});

app.post('/blockdata', function (req, res) {
    const {plant, zone} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const datatable = plant + 'data';
    plnt('data').select('*').where({
        datatable: zone,
    })
        .then(resp => res.json({
            status: 'Success',
            body: resp,
        }))
        .catch(err => res.json({status: 'No table for the date for the each zone is present. Please Update it'}));
});

app.listen(3000, function () {
    console.log("I Love You 3000");
});

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
};

app.post('/getblockdata', function (req, res) {
    const {plant, zone, inverter, smb, block, cycle, year} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    let table = "cleanstatuscontract" + year.toString() + "cycle" + cycle.toString();
    plnt(table).select('_40mod', '_cleanstatus', 'updateDate', 'updateTime', 'comments').where({
        'zone': zone,
        'blockname': block,
        'inverter': inverter,
        'smb': smb,
    }).then(resp => {
        let data = [];
        resp.map((dat, i) => {
            let date12 = dat.updateDate.getFullYear() + '-' + ('0' + (dat.updateDate.getMonth() + 1)).slice(-2) + '-' + ('0' + dat.updateDate.getDate()).slice(-2);
            data1 = {
                fmod: dat["_40mod"],
                cleanstatus: dat["_cleanstatus"],
                updateDate: date12,
                updateTime: dat["updateTime"],
                comments: dat["comments"]
            };
            data.push(data1);
        });
        res.json(data);
    });
});

app.post('/createplant', function (req, res) {
    const {plant, blocks, totalrows, zone, inverter, smb, _40mrows, _20mrows, wp, totalmodules} = req.body;
    const noplant = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
        }
    });
    noplant.raw(`CREATE DATABASE ${plantdb(plant)}`)
        .then(hell => {
            noplant.destroy();
            const plnt = knex({
                client: 'mysql',
                connection: {
                    host: 'localhost',
                    user: 'root',
                    password: 'password',
                    database: plantdb(plant),
                }
            });
            const datatable = plant + 'data';
            plnt.schema.createTable(datatable, table => {
                table.increments('id');
                table.string('blockname');
                table.integer('totalrows');
                table.integer('zone');
                table.string('inverter');
                table.string('smb');
                table.integer('_40mrows');
                table.integer('_20mrows');
                table.integer('wp');
                table.integer('totalmodules');
            })
                .then(stark => {
                    promisearray = [];
                    for (let i = 0; i < blocks.length; i++) {
                        promisearray.push(plnt(datatable).insert({
                            blockname: blocks[i],
                            totalrows: totalrows[i],
                            zone: zone[i],
                            inverter: inverter[i],
                            smb: smb[i],
                            _40mrows: _40mrows[i],
                            _20mrows: _20mrows[i],
                            wp: wp[i],
                            totalmodules: totalmodules[i]
                        }));
                    }
                    const response = [];
                    Promise.all(promisearray.map((promise, i) => {
                        promise.then(hello => response.push(i));
                    }))
                        .then(denmark => {
                            db('plants').insert({
                                plant_name: plant,
                            })
                                .then(india => res.json("Success"));
                        });
                })
        })
})

app.post('/getdataofparticularcycle', function (req, res) {
    const {plant, cycle} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    plnt('cycledata').select('startdate', 'duration').where('cyclenum', '=', cycle)
        .then(resp => {
            let start = resp[0].startdate;
            let duration = resp[0].duration;
            let startdate = new Date(start);
            let startdatefinal = startdate.getFullYear() + '-' + ('0' + (startdate.getMonth() + 1)).slice(-2) + '-' + ('0' + startdate.getDate()).slice(-2);
            let endDate = startdate.addDays(duration);
            let endDatefinal = endDate.getFullYear() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + ('0' + endDate.getDate()).slice(-2);
            res.json({
                startdate: startdatefinal,
                endDate: endDatefinal,
            })
        });
});

app.post('/getimages', function (req, res) {
    const {plant, cycle, zone, row, block, inverter, smb, year} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const table = 'cleanstatuscontract' + year.toString() + 'cycle' + cycle.toString();
    plnt(table).select('precleanimage', 'postcleanimage').where({
        'zone': zone,
        'blockname': block,
        'row_num': row,
        'inverter': inverter,
        'smb': smb
    })
        .then(resp => {
            let precleaned = atob(resp[0].precleanimage);
            let postcleaned = atob(resp[0].postcleanimage);
            if (precleaned.substring(0, 4) !== "data") {
                precleaned = "data:image/jpeg;base64," + precleaned;
            }
            if (postcleaned.substring(0, 4) !== "data") {
                postcleaned = "data:image/jpeg;base64," + postcleaned;
            }
            res.json({
                precleaned: precleaned,
                postcleaned: postcleaned
            })
        });
});

app.post('/zoneprogress', function (req, res) {
    const {plant, year, cycle, zonenum} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const datatable = plant + 'data';
    const promisearray = [];
    let response = [];
    let totalmods = [];
    const table = 'cleanstatuscontract' + year.toString() + 'cycle' + cycle.toString();
    for (let i = 0; i < zonenum; i++) {
        promisearray.push(plnt(table).select('_40mod').where({'zone': i + 1, '_cleanstatus': true}));
    }
    Promise.all(promisearray.map((promise, i) => {
        return promise.then(rsp => {
            const fortyrows = rsp.filter(mod => mod['_40mod'] == true);
            const twentyrows = rsp.filter(mod => mod['_40mod'] == false);
            const total_cleaned = fortyrows.length * 40 + twentyrows.length * 20;
            response.push({
                total_cleaned: total_cleaned,
                zone: i + 1,
            });
        });
    }))
        .then(hello => {
            let geometry = [];
            for (let i = 0; i < zonenum; i++) {
                geometry.push(plnt(datatable).sum('totalmodules').where('zone', '=', i + 1));
            }
            Promise.all(geometry.map((promise, i) => {
                return promise.then(rsp => {
                    totalmods.push({
                        total: rsp[0]['sum(`totalmodules`)'],
                        zone: i + 1,
                    })
                })
            })).then(hulk => {
                const groot = [];
                response.map((ini, i) => {
                    const lk = ini.total_cleaned;
                    const zk = ini.zone;
                    totalmods.map((yi, j) => {
                        const lj = yi.total;
                        const zj = yi.zone;
                        if (zk === zj)
                            groot.push({
                                zone: zk,
                                progress: Math.floor((lk / lj) * 100),
                            });
                        groot.sort(function (a, c) {
                            return a.zone - c.zone;
                        })
                    });
                });
                res.status(200).json(groot);
            });
        });
});

app.put('/cycleStats', function (req, res) {
    const {plant, date, zone, row, block, inverter, SMB, cycle, newdate, newStatus, newTime, newComment} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    let updatedate, updatestatus, updatetime, updatecomment;
    newdate !== '' ? updatedate = newdate : updatedate = undefined;
    newStatus !== '' ? updatestatus = newStatus : updatestatus = undefined;
    newTime !== '' ? updatetime = newTime : updatetime = undefined;
    newComment !== '' ? updatecomment = newComment : updatecomment = undefined;

    let gate = new Date(date);
    let contractyear = gate.getFullYear().toString();
    let cyclese = cycle.toString();
    const table = 'cleanstatuscontract' + contractyear + 'cycle' + cyclese;
    plnt(table).update({
        '_cleanstatus': updatestatus,
        'updateDate': updatedate,
        'updateTime': updatetime,
        'comments': updatecomment,
    }).where(
        {
            'zone': zone,
            'row_num': row,
            'blockname': block,
            'inverter': inverter,
            'smb': SMB,
        }
    )
        .then(resp => res.json({
            'status': "Updated",
        }));
});


app.post('/rowstatsdetailed', function (req, res) {
    const {plant, year, zone, row, block, inverter, SMB, cycle} = req.body;
    const plnt = knex({
        client: 'mysql',
        connection: {
            host: 'localhost',
            user: 'root',
            password: 'password',
            database: plantdb(plant),
        }
    });
    const promisearray = [];
    for (let i = 0; i < cycle; i++) {
        let table = "cleanstatuscontract" + year.toString() + "cycle" + (i + 1).toString();
        promisearray.push(plnt(table).where({
            'zone': zone,
            'row_num': row,
            'blockname': block,
            'inverter': inverter,
            'smb': SMB
        })
            .select('_cleanstatus', '_40mod', 'updateDate', 'updateTime'));
    }

    const b = [];
    Promise.all(promisearray.map((promise, i) => {
            return promise.then(resp => {
                let date = new Date(resp[0].updateDate);
                let updateDatefinal = date.getFullYear() + '-' + ('0' + (date.getMonth() + 1)).slice(-2) +
                    '-' + ('0' + date.getDate()).slice(-2);
                b.push({
                    cycle: i + 1,
                    Clean_Status: resp[0]._cleanstatus === 1 ? 'True' : 'False',
                    Is_it_40_Module_Row: resp[0]._40mod === 1 ? 'True' : 'False',
                    updateDate: updateDatefinal,
                    updateTime: resp[0].updateTime
                })
            })
        })
    ).then(hello => {
        b.sort(function (a, c) {
            return a.cycle - c.cycle;
        });
        res.json({
            Status: 'Success',
            body: b
        });
    })
        .catch(err => res.json({Status: 'Error Finding data for the row specified'}));
});

app.get('/getplants', function (req, res) {
    db('plants').select('*')
        .then(resa => res.json(resa));
});

const plantdb = (plant) => {
    return 'ssael_' + plant + 'plantmaintenance';
};