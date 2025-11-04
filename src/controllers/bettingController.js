const { Sequelize, where, Op } = require("sequelize");
const ExcelJS = require('exceljs');
const { betting, users, events, marriedbetting, usertransactions, rounds, winners } = require("../db");
const PDFDocument = require('pdfkit');
const stream = require('stream');
const { logger } = require("sequelize/lib/utils/logger");
const { round } = require("lodash");



async function GetAll(req, res) {
    try {
        const dtabetting = await betting.findAll({
            include: [
                { model: users, attributes: ['username'] },
                { model: events, attributes: ['name'] }
            ],
        });
        return res.json({
            success: true,
            message: 'Apuestas encontradas',
            data: dtabetting
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las apuestas',
            error: error.message
        });
    }
}

async function GetBetsByTeam(req, res) {
    const { team, id_round, id_event } = req.body;
    try {
        const totalAmount = await betting.sum('amount', {
            where: { team, id_round, id_event },
        });

        const dtabetting = await betting.findAll({
            where: { team, id_round, id_event },
            include: [
                { model: users, attributes: ['username'] },
                { model: events, attributes: ['name'] }
            ],
        });

        return res.json({
            success: true,
            message: 'Apuestas encontradas',
            totalAmount,
            data: totalAmount
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las apuestas',
            error: error.message
        });
    }
}

const getBetsByRound = async (req, res) => {
    try {
        const { id } = req.params;

        const bets = await betting.findAll({
            where: { id_round: id },
            include: [
                { model: users, attributes: ['username'] },
            ],
        });
        return res.json({
            success: true,
            message: 'Apuestas encontradas',
            data: bets
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las apuestas',
            error: error.message
        });
    }
}

async function GetId(req, res) {
    const { id } = req.params;
    try {
        const dtabetting = await betting.findByPk(id, {
            include: [
                { model: users, attributes: ['username'] },
                { model: events, attributes: ['name'] }
            ],
        });
        if (dtabetting) {
            return res.json({
                success: true,
                message: 'Apuesta encontrada',
                data: dtabetting
            });
        }
        return res.status(404).json({
            success: false,
            message: 'Apuesta no encontrada'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener la apuesta',
            error: error.message
        });
    }
}

async function Create(req, res) {
    const { id_user, id_event, amount, team } = req.body;
    try {
        if (!id_user || !id_event || !amount || !team) {
            return res.status(400).json({
                success: false,
                message: 'Todos los campos son obligatorios'
            });
        }
        const dtabetting = await betting.create({ id_user, id_event, amount, team });
        return res.status(201).json({
            success: true,
            message: 'Apuesta creada con éxito',
            data: dtabetting
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al crear la apuesta',
            error: error.message
        });
    }
}

async function Update(req, res) {
    const { id } = req.params;
    const { amount, team } = req.body;

    try {
        if (!amount && !team) {
            return res.status(400).json({
                success: false,
                message: 'Debe proporcionar al menos un campo para actualizar'
            });
        }
        const updated = await betting.update({ amount, team }, { where: { id } });
        if (updated[0] > 0) {
            return res.json({
                success: true,
                message: 'Apuesta actualizada con éxito'
            });
        }
        return res.status(404).json({
            success: false,
            message: 'Apuesta no encontrada'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al actualizar la apuesta',
            error: error.message
        });
    }
}

async function Delete(req, res) {
    const { id } = req.params;

    try {
        const deleted = await betting.destroy({ where: { id } });
        if (deleted) {
            return res.json({
                success: true,
                message: 'Apuesta eliminada con éxito'
            });
        }
        return res.status(404).json({
            success: false,
            message: 'Apuesta no encontrada'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al eliminar la apuesta',
            error: error.message
        });
    }
}

async function getMarriedBetting(req, res) {
    const { id_event, id_round } = req.params;
    console.log(id_event, id_round);

    try {
        const marriedBetting = await marriedbetting.findAll({
            include: [
                {
                    model: betting,
                    as: 'bettingOne',
                    attributes: ['id', 'amount', 'status', "team"],
                    include: [
                        {
                            model: users,
                            attributes: ['username'], // Solo traemos el nombre del usuario
                        }
                    ]
                },
                {
                    model: betting,
                    as: 'bettingTwo',
                    attributes: ['id', 'amount', 'status'],
                    include: [
                        {
                            model: users,
                            attributes: ['username'], // Solo traemos el nombre del usuario
                        }
                    ]
                }
            ],
            where: { id_event, id_round },
            attributes: ['id_betting_one', 'id_betting_two']
        });

        return res.json({
            success: true,
            message: 'Apuestas encontradas',
            data: marriedBetting
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las apuestas',
            error: error.message
        });
    }
}

const getReportsTransactions = async (req, res) => {
    try {
        // Recibir las fechas como parametros en la query string
        const { startDate, endDate } = req.query;

        // Verificar si ambas fechas están presentes
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, proporciona un rango de fechas válido.'
            });
        }

        // Realizar la consulta utilizando Sequelize
        const transactions = await usertransactions.findAll({
            where: {
                createdAt: {
                    [Sequelize.Op.between]: [`${startDate} 00:00:00`, `${endDate} 23:59:59`],  // Filtrar por el rango de fechas
                },
            },
            include: [
                {
                    model: users,
                    attributes: ['username', 'first_name', 'last_name', 'email'],  // Incluir datos de usuarios
                },
                {
                    model: rounds,
                    as: 'roundData', // Alias de la relación de rounds
                    attributes: ['id', 'round', 'is_betting_active'],  // Incluir datos de rondas
                    include: [
                        {
                            model: events,
                            as: 'event',  // Usar el alias 'event' (que está definido en la asociación)
                            attributes: ['id', 'name'],  // Incluir datos de eventos
                        }
                    ]
                }
            ],
            order: [
                ['id_user', 'DESC'],
                ['id', 'DESC'],


            ],
            // Ordenar por fecha de creación en orden descendente
        });

        // Crear un nuevo libro de Excel
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Transacciones');


        // Título en la celda A1, ocupando toda la primera fila
        worksheet.mergeCells('A1:P1');  // Fusiona de A1 a P1
        const titleCell = worksheet.getCell('A1');
        titleCell.value = 'Arte Gallera';
        titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        titleCell.font = { size: 25, bold: true };

        // Subtítulo en la celda A2, ocupando toda la segunda fila
        worksheet.mergeCells('A2:P2');  // Fusiona de A2 a P2
        const subTitleCell = worksheet.getCell('A2');
        subTitleCell.value = `Historial de transacciones de ${startDate} hasta ${endDate}`;
        subTitleCell.alignment = { horizontal: 'center', vertical: 'middle' };
        subTitleCell.font = { size: 16, bold: true };


        // Establecer encabezados

        const headers = ['ID Transacción', 'Fecha', 'Evento', 'Pelea', 'Usuario', 'Tipo', 'Monto', 'Balance anterior', 'Balance actual', 'Equipo'];
        worksheet.addRow(headers);

        // Ajustar el ancho de las columnas basado en el contenido de los encabezados
        headers.forEach((header, index) => {
            // Si es la columna de fecha (índice 9), le damos un ancho específico
            if (index === 9) {
                worksheet.getColumn(index + 1).width = 12;  // Ajustar a un tamaño adecuado para la fecha
                worksheet.getColumn(index + 1).style.numFmt = '@';  // Forzar formato como texto (evitar interpretación como fecha)
            } else {
                worksheet.getColumn(index + 1).width = Math.max(header.length, 15); // Ajusta la columna a un tamaño mínimo de 15 caracteres
            }
        });


        // Llenar las filas con los datos de las transacciones
        transactions.forEach(transaction => {
            const date = new Date(transaction.createdAt);
            const formattedDate =
                `${String(date.getDate()).padStart(2, '0')}/` +
                `${String(date.getMonth() + 1).padStart(2, '0')}/` +  // Los meses comienzan desde 0
                `${date.getFullYear()}`;

            worksheet.addRow([
                transaction.id,
                formattedDate, // Fecha formateada sin hora
                transaction.roundData?.event.name,
                transaction.roundData?.round,
                transaction.user.username,
                transaction.type_transaction,
                transaction.amount,
                transaction.previous_balance,
                transaction.current_balance,
                transaction.team,
            ]);
        });

        // Configurar el tipo de respuesta como un archivo de Excel
        res.setHeader('Content-Disposition', 'attachment; filename=transacciones.xlsx');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        // Enviar el archivo Excel como respuesta
        await workbook.xlsx.write(res);
        res.end();

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las transacciones',
            error: error.message
        });
    }
};

const getTransactionsByUsersAndEvent = async (req, res) => {
    try {
        // Recibir las fechas como parámetros en la query string
        const { id_user, id_event } = req.params;

        // Verificar si ambas fechas están presentes
        if (!id_user || !id_event) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, proporciona el id del usuario y del evento'
            });
        }

        // Realizar la consulta utilizando Sequelize
        const transactions = await usertransactions.findAll({
            where: {
                id_user, id_event
            },
            include: [
                {
                    model: users,
                    attributes: ['username', 'first_name', 'last_name', 'email'],  // Incluir datos de usuarios
                },
                {
                    model: rounds,
                    as: 'roundData', // Alias de la relación de rounds
                    attributes: ['id', 'round', 'is_betting_active'],  // Incluir datos de rondas
                    include: [
                        {
                            model: events,
                            as: 'event',  // Usar el alias 'event' (que está definido en la asociación)
                            attributes: ['id', 'name'],  // Incluir datos de eventos
                        }
                    ]
                }
            ],
            order: [
                ['round', 'DESC'],  // Ordenamos por el round de mayor a menor
            ],
        });



        // Agrupar las transacciones por 'round' y ordenarlas por id dentro de cada grupo
        const groupedTransactions = transactions.reduce((acc, transaction) => {
            const round = transaction.roundData.round;
            if (!acc[round]) {
                acc[round] = [];
            }
            acc[round].push(transaction);
            return acc;
        }, {});

        // Convertir el objeto en un array de rounds y ordenarlo de mayor a menor
        const sortedRounds = Object.keys(groupedTransactions).sort((a, b) => b - a);

        // Crear un nuevo array con las transacciones agrupadas y ordenadas
        const sortedTransactions = sortedRounds.map(round => {
            return {
                round,
                transactions: groupedTransactions[round].sort((a, b) => b.id - a.id)  // Ordenar las transacciones dentro del round
            };
        });

        return res.status(200).json({
            success: true,
            data: sortedTransactions,
            message: 'Transacciones encontradas y ordenadas'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las transacciones',
            error: error.message
        });
    }
};

const getEventByUsersAndEvent = async (req, res) => {
    try {
        // Recibir el id del usuario
        const { id_user } = req.params;

        // Verificar si el id_user está presente
        if (!id_user) {
            return res.status(400).json({
                success: false,
                message: 'Por favor, proporciona el id del usuario'
            });
        }

        // Realizar la consulta utilizando Sequelize
        const transactionsResp = await usertransactions.findAll({
            where: {
                id_user
            },
            include: [
                {
                    model: rounds,
                    as: 'roundData', // Alias de la relación de rounds
                    attributes: ['id', 'round'],  // Incluir datos de rondas
                    include: [
                        {
                            model: events,
                            as: 'event',  // Usar el alias 'event' (que está definido en la asociación)
                            attributes: ['id', 'name', 'createdAt'],  // Incluir datos de eventos y la fecha de creación
                            required: true,  // Solo incluir transacciones que tengan eventos
                        }
                    ]
                }
            ],

            // raw:true,
            // logging: console.log
        });

        const eventsUnicos = [];

        // Recoger los eventos sin duplicados
        transactionsResp.forEach(transaction => {
            // console.log(transaction.roundData.event.id,transaction.id,transaction.id_event);

            if (!eventsUnicos.some(event => event.id === transaction.id_event)) {
                eventsUnicos.push({
                    id: transaction.id_event,
                    name: transaction.roundData.event.name
                });
            }
        });

        return res.status(200).json({
            success: true,
            data: eventsUnicos,
            message: 'Eventos encontrados'
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener las transacciones',
            error: error.message
        });
    }
};

const getTransactionsAndUser = async (userId, eventId) => {
    try {

        if (!userId || !eventId) return;

        const user = await users.findByPk(userId);
        // Realizar la consulta utilizando Sequelize
        const transactions = await usertransactions.findAll({
            where: {
                id_user: userId,
                id_event: eventId,  // Filtro principal para asegurarse de que solo se traigan las transacciones del evento correcto
            },
            include: [
                {
                    model: users,
                    attributes: ['username', 'first_name', 'last_name', 'email'],  // Incluir datos de usuarios
                },
                {
                    model: rounds,
                    as: 'roundData', // Alias de la relación de rounds
                    attributes: ['id', 'round', 'is_betting_active'],  // Incluir datos de rondas
                    include: [
                        {
                            model: events,
                            as: 'event',  // Usar el alias 'event' (que está definido en la asociación)
                            attributes: ['id', 'name', 'date'],  // Incluir datos de eventos
                            where: { id: eventId }  // Aseguramos que solo se traigan los eventos con el id_event especificado
                        }
                    ]
                }
            ],
            order: [
                ['round', 'DESC'],  // Ordenamos por el round de mayor a menor
            ],
            // raw: true,
            // logging: console.log  // Imprime la consulta SQL en la consola
        });

        // Agrupar las transacciones por 'round' y ordenarlas por id dentro de cada grupo
        const groupedTransactions = transactions.reduce((acc, transaction) => {

            const round = transaction.roundData.round;

            if (!acc[round]) {
                acc[round] = [];
            }
            acc[round].push(transaction);
            return acc;
        }, {});
        const sortedRounds = Object.keys(groupedTransactions).sort((a, b) => b - a);
        // Crear un nuevo array con las transacciones agrupadas y ordenadas
        const sortedTransactions = sortedRounds.map(round => {
            return {
                round,
                transactions: groupedTransactions[round].sort((a, b) => b.id - a.id)  // Ordenar las transacciones dentro del round
            };
        });

        const transactionList = sortedTransactions.map(item => ({
            round: item.round,
            transactions: item.transactions.map(tx => ({
                id: tx.id,
                username: tx.user.username,
                transactionType: tx.type_transaction,
                previousBalance: tx.previous_balance,
                amount: tx.amount,
                currentBalance: tx.current_balance,
                team: tx.team,
                eventName: tx.roundData.event.name,
                eventDate: tx.roundData.event.date,
                id_round: tx.id_round
            }))
        }));

        const date = new Date(transactionList[0].transactions[0].eventDate);

        const day = String(date.getDate()).padStart(2, '0');  // Obtener el día con formato de 2 dígitos
        const month = String(date.getMonth() + 1).padStart(2, '0');  // Obtener el mes (añadir 1 porque los meses comienzan desde 0)
        const year = date.getFullYear();  // Obtener el año

        const eventDate = `${day}/${month}/${year}`;

        const eventName = transactionList[0].transactions[0].eventName

        // Calcular el saldo inicial y final
        const endAmount = transactionList[0].transactions[0].currentBalance; // Saldo final
        // const startAmount = transactionList[transactionList.length - 1].transactions[transactionList[transactionList.length - 1].transactions.length - 1].previousBalance; // Saldo inicial
        const startAmountResp = await usertransactions.findOne({where:{id_user:userId,id_event:eventId, team: {
            [Op.ne]: null  // Esto asegura que round no sea null
          }}})
        const startAmount = startAmountResp?.previous_balance
        const userInfo = {
            username: user.username,
            first_name: user.first_name,
            last_name: user.last_name,
            eventDate: eventDate,
            startAmount: startAmount,
            endAmount: endAmount
        };
        return { transactionList, user, eventDate, endAmount, startAmount, eventName, userInfo }
    } catch (error) {
        console.error(error);
    }
};



async function getWinnersByEventAndRound(id_event, round) {
    try {
        const winnerData = await winners.findOne({
            include: [
                {
                    model: rounds,
                    as: 'round',
                    where: { round: round }, // Filtra por el campo 'round'
                },
                {
                    model: events,
                    as: 'event',
                    where: { id: id_event }, // Filtra por el id_event
                }
            ]
            , raw: true
        });

        return winnerData;
    } catch (error) {
        console.error('Error al obtener los ganadores:', error);
    }
}

const generatePDF = async (req, res) => {
    try {
        const { id_user, id_event } = req.params;
        const data = await getTransactionsAndUser(id_user, id_event);
        const { transactionList, eventDate, endAmount, startAmount, eventName, userInfo } = data;

        const startX = 50;
        const rowHeight = 20;
        const headerHeight = 25;
        const headerBackgroundColor = '#FFD700';
        const headerBorderRadius = 5;
        const textColor = 'white';

        const doc = new PDFDocument({
            autoFirstPage: false,
            size: [820, 1000]
        });

        // Create a PassThrough stream to buffer the PDF output
        const pdfBufferStream = new stream.PassThrough();
        doc.pipe(pdfBufferStream); // Pipe PDF into the buffer stream

        const totalWidth = 820 - 2 * startX;
        const columnWidths = totalWidth * 0.14;

        let currentY = 50;

        // Function to draw background
        const drawBackground = () => {
            const gradient = doc.linearGradient(0, 0, 0, 1000);
            gradient.stop(0, '#000000');
            gradient.stop(1, '#1c1502');
            doc.rect(0, 0, 820, 1000).fill(gradient);
        };

        // Function to check if a new page is needed based on available space
        const addPageIfNeeded = () => {
            if (currentY > 700) {
                doc.addPage();
                drawBackground();
                currentY = 50;
                doc.fillColor(textColor);
                doc.strokeColor('white');
            }
        };

        // First Page Setup
        doc.addPage();
        drawBackground();

        const bannerPath = './g.png';
        doc.image(bannerPath, 0, 0, { width: 820, height: 100 });

        doc.fillColor('#FFD700')
            .moveDown(5)
            .fontSize(30)
            .text(eventName, {
                underline: true,
                align: 'center'
            });

        const infoStartY = 200;

        doc
            .fillColor('gold')
            .fontSize(15)
            .text(`Nombre de usuario:`, startX, infoStartY, { bold: true })
            .text(`Nombre:`, startX, infoStartY + 20, { bold: true })
            .text(`Fecha del evento:`, startX, infoStartY + 40, { bold: true })
            .text(`Saldo inicial:`, startX, infoStartY + 60, { bold: true })
            .text(`Saldo final:`, startX, infoStartY + 80, { bold: true })

            // Respuestas en color blanco
            .fillColor('white')
            .fontSize(15)
            .text(`${userInfo.username}`, startX + 150, infoStartY)
            .text(`${userInfo.first_name} ${userInfo.last_name}`, startX + 150, infoStartY + 20)
            .text(`${eventDate}`, startX + 150, infoStartY + 40)
            .text(`${startAmount}`, startX + 150, infoStartY + 60)
            .text(`${endAmount}`, startX + 150, infoStartY + 80);

        currentY = infoStartY + 120;

        const createTable = (transactions, round, winnerText) => {
            let winnerTextColor = '#FFD700'; // Color dorado por defecto para round
            if (winnerText.includes("Verde")) winnerTextColor = 'green'; // Color verde si el texto es "Verde"
            if (winnerText.includes("Rojo")) winnerTextColor = 'red'; // Color rojo si el texto es "Rojo"
            if (winnerText.includes("tablas")) winnerTextColor = 'orange'; // Color ámbar si el texto es "tablas"

            doc.fillColor('gold')
                .fontSize(16)
                .text(`Pelea ${round} `, startX - 30, currentY, { underline: false });

            doc.fillColor(winnerTextColor)
                .fontSize(16)
                .text(winnerText, startX - 30 + doc.widthOfString(`Pelea ${round}`), currentY, { underline: false });

            currentY += 25;
            doc.fontSize(10);

            const headers = ['#', 'USUARIO', 'TRANSACCIÓN', 'S. ANTERIOR', 'MONTO', 'S. ACTUAL', 'EQUIPO'];

            const drawRoundedRect = (x, y, width, height, radius) => {
                doc.moveTo(x + radius, y)
                    .lineTo(x + width - radius, y)
                    .arc(x + width - radius, y + radius, radius, -Math.PI / 2, 0)
                    .lineTo(x + width, y + height - radius)
                    .arc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2)
                    .lineTo(x + radius, y + height)
                    .arc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI)
                    .lineTo(x, y + radius)
                    .arc(x + radius, y + radius, radius, Math.PI, -Math.PI / 2)
                    .closePath()
                    .fill(headerBackgroundColor)
                    .stroke();
            };

            // Dibuja los encabezados
            headers.forEach((header, i) => {
                drawRoundedRect(startX + (i * columnWidths), currentY, columnWidths, headerHeight, headerBorderRadius);
                doc.fillColor(textColor)
                    .text(header, startX + (i * columnWidths), currentY + 8, { width: columnWidths, align: 'center' });
            });

            currentY += headerHeight;

            let numberOrder = transactions.length;
            const maxRowsPerPage = 10; // Número máximo de transacciones por página
            let chunkedTransactions = [];

            // Dividir las transacciones en partes de máximo 10
            for (let i = 0; i < transactions.length; i += maxRowsPerPage) {
                chunkedTransactions.push(transactions.slice(i, i + maxRowsPerPage));
            }

            // Ahora procesamos cada fragmento de 10 transacciones
            chunkedTransactions.forEach((chunk, chunkIndex) => {
                addPageIfNeeded();
                chunk.forEach((movement, index) => {
                    const rowY = currentY + (index * rowHeight);
                    const rowData = [
                        numberOrder--,
                        movement.username,
                        movement.transactionType,
                        movement.previousBalance == 0 ? "0" : movement.previousBalance,
                        movement.amount,
                        movement.currentBalance == 0 ? "0" : movement.currentBalance,
                        movement.team
                    ];

                    doc.strokeColor('white');
                    rowData.forEach((item, i) => {
                        doc.rect(startX + (i * columnWidths), rowY, columnWidths, rowHeight).stroke();
                        doc.text((item ? item : "").toString(), startX + (i * columnWidths), rowY + 5, { width: columnWidths, align: 'center' });
                    });
                });

                currentY += (chunk.length * rowHeight) + headerHeight + 20; // Actualizamos currentY
            });
        };

        // Generación de las tablas para cada ronda de transacciones
        for (const roundData of transactionList) {
            try {
                const winner = await getWinnersByEventAndRound(id_event, roundData.round);

                const winnerText = ` (${winner?.team_winner == "draw" ? "Tablas" : winner?.team_winner === "red" ? "Ganador Rojo" : "Ganador Verde"})`;

                createTable(roundData.transactions, roundData.round, winnerText);
            } catch (error) {
                console.error("Error al obtener los ganadores:", error);
            }
        }

        doc.end();

        const pdfBuffer = [];
        pdfBufferStream.on('data', (chunk) => {
            pdfBuffer.push(chunk);
        });

        pdfBufferStream.on('end', () => {
            const pdfData = Buffer.concat(pdfBuffer);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'attachment; filename="movimientos_bancarios.pdf"');
            res.send(pdfData);
        });

    } catch (error) {
        console.error('Error al generar el PDF:', error);
        if (!res.headersSent) {
            res.status(500).send('Hubo un error al generar el PDF!.');
        }
    }
};


module.exports = {
    GetAll,
    GetId,
    Create,
    Update,
    Delete,
    GetBetsByTeam,
    getBetsByRound,
    getMarriedBetting,
    getReportsTransactions,
    getTransactionsByUsersAndEvent,
    getEventByUsersAndEvent,
    generatePDF
};
