const jwt = require("jsonwebtoken");
const { events, users,rounds } = require("../db");
const { Op, where } = require("sequelize");
const { log } = require("winston");

async function GetAll(req, res) {
    let result = {};
    try {
        let dtaevents = await events.findAll();
        result = {
            success: true,
            message: 'Eventos encontrados',
            data: dtaevents
        };
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}

async function GetId(req, res) {
    let result = {};
    try {
        let { id } = req.params;
        let dtaevent = await events.findByPk(id);
        if (dtaevent) {
            result = {
                success: true,
                message: 'Evento encontrado',
                data: dtaevent
            };
        } else {
            result = {
                success: false,
                message: 'Evento no encontrado'
            };
        }
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}
async function Create(req, res) {
    let result = {};
    try {
        // se verifica que no haya peleas abiertas o sin ganador en el evento actual 
        const bettingsActive = await rounds.findOne({where:{ id_winner:null }})
        if (bettingsActive) {
            result = {
                success: false,
                data: {},
                message: `La pelea #${bettingsActive.round} esta abierta o no tiene ganador.`
            };
            return res.json(result);
        }
        //verifica y cambia el is_active a false de los eventos que esten activos
        await events.update({ is_active: false }, { where: { is_active: true } });



        let { name, date, time, location, is_active, is_betting_active } = req.body;
        const totalAmountUsers = await users.sum('initial_balance', { where: { is_active: true } });
        let dtaevent = await events.create({ name, date, time, location, is_active, is_betting_active, total_amount: totalAmountUsers });
        if (dtaevent) {
            result = {
                success: true,
                data: dtaevent,
                message: 'Evento creado con Éxito'
            };
        }
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}
async function Update(req, res) {
    let result = {};
    try {
        let { id } = req.params;
        let { name, date, location } = req.body;
        let dtaevent = await events.update({ name, date, location }, { where: { id } });
        if (dtaevent) {
            result = {
                success: false,
                message: 'Error al actualizar el evento'
            };
        }
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}
async function Delete(req, res) {
    let result = {};
    try {
        let { id } = req.params;
        let dtaevent = await events.destroy({ where: { id } });
        if (dtaevent) {
            result = {
                success: false,
                message: 'Error al eliminar el evento'
            };
        }
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}

async function UpdateSpectators(req, res) {
    let result = {};
    try {
        let { id } = req.params;
        let { base_viewers } = req.body;

        const parsedBaseViewers = Number(base_viewers);
        if (!Number.isFinite(parsedBaseViewers) || parsedBaseViewers < 0 || !Number.isInteger(parsedBaseViewers)) {
            result = {
                success: false,
                message: 'base_viewers debe ser un número entero mayor o igual a 0'
            };
            return res.json(result);
        }

        const [updatedRows] = await events.update({ base_viewers: parsedBaseViewers }, { where: { id } });
        if (updatedRows > 0) {
            result = {
                success: true,
                message: 'Espectadores actualizados'
            };
        } else {
            result = {
                success: false,
                message: 'Evento no encontrado'
            };
        }
    } catch (error) {
        result = {
            success: false,
            message: 'Error al ejecutar la funcion',
            error: error.message
        };
    }
    return res.json(result);
}
module.exports = {
    GetAll,
    GetId,
    Create,
    Update,
    Delete,
    UpdateSpectators
}