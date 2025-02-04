const { Sequelize, DataTypes, Op } = require('sequelize');

// Configuración de PostgreSQL
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: 'localhost',
    port: 5432,
    username: 'postgres', 
    password: '0750213233carlos', 
    database: 'chat.db',
    logging: true,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

const User = sequelize.define('User', {
    username: {
        type: DataTypes.STRING(50),
        primaryKey: true,
        allowNull: false,
        unique: true
    },
    status: {
        type: DataTypes.STRING(20),
        defaultValue: 'offline'
    },
    last_seen: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'users',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

const Message = sequelize.define('Message', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    sender: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: User,
            key: 'username'
        }
    }
}, {
    tableName: 'messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Modelo de Mensaje Privado
const PrivateMessage = sequelize.define('PrivateMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    sender: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: User,
            key: 'username'
        }
    },
    receiver: {
        type: DataTypes.STRING(50),
        allowNull: false,
        references: {
            model: User,
            key: 'username'
        }
    }
}, {
    tableName: 'private_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false
});

// Función para usuarios en línea
async function getOnlineUsers() {
    try {
        return await User.findAll({
            where: { status: 'online' },
            attributes: ['username', 'status', 'last_seen']
        });
    } catch (error) {
        console.error('Error al obtener usuarios en línea:', error);
        throw error;
    }
}

// Función para mensajes privados
async function getPrivateMessages(user1, user2, limit = 50) {
    try {
        return await PrivateMessage.findAll({
            where: {
                [Op.or]: [
                    { sender: user1, receiver: user2 },
                    { sender: user2, receiver: user1 }
                ]
            },
            order: [['created_at', 'DESC']],
            limit,
            attributes: ['id', 'content', 'sender', 'receiver', 'created_at']
        });
    } catch (error) {
        console.error('Error al obtener mensajes privados:', error);
        throw error;
    }
}

async function deleteUser(username) {
    try {
        return await User.destroy({
            where: { username }
        });
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        throw error;
    }
}

// Función para limpiar mensajes antiguos
async function cleanOldMessages(daysOld = 30) {
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);

        await Message.destroy({
            where: {
                created_at: {
                    [Op.lt]: cutoffDate
                }
            }
        });

        await PrivateMessage.destroy({
            where: {
                created_at: {
                    [Op.lt]: cutoffDate
                }
            }
        });
    } catch (error) {
        console.error('Error al limpiar mensajes antiguos:', error);
        throw error;
    }
}

// Funciones para manejar usuarios
async function createUser(username) {
    try {
        const [user, created] = await User.findOrCreate({
            where: { username },
            defaults: {
                status: 'online',
                last_seen: null
            }
        });
        
        if (!created) {
            await user.update({
                status: 'online',
                last_seen: null
            });
        }
        
        return user;
    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw error;
    }
}

async function updateUserStatus(username, status) {
    try {
        await User.update(
            {
                status,
                last_seen: status === 'offline' ? new Date() : null
            },
            {
                where: { username }
            }
        );
    } catch (error) {
        console.error('Error al actualizar estado de usuario:', error);
        throw error;
    }
}

async function getAllUsers() {
    try {
        return await User.findAll({
            attributes: ['username', 'status', 'last_seen']
        });
    } catch (error) {
        console.error('Error al obtener todos los usuarios:', error);
        throw error;
    }
}

// Funciones para manejar mensajes
async function saveMessage(sender, content) {
    try {
        return await Message.create({
            sender,
            content
        });
    } catch (error) {
        console.error('Error al guardar mensaje:', error);
        throw error;
    }
}

async function getRecentMessages(limit = 50) {
    try {
        return await Message.findAll({
            order: [['created_at', 'DESC']],
            limit,
            attributes: ['id', 'content', 'sender', 'created_at']
        });
    } catch (error) {
        console.error('Error al obtener mensajes recientes:', error);
        throw error;
    }
}

async function savePrivateMessage(sender, receiver, content) {
    try {
        return await PrivateMessage.create({
            sender,
            receiver,
            content
        });
    } catch (error) {
        console.error('Error al guardar mensaje privado:', error);
        throw error;
    }
}

// Inicializar la base de datos
async function initDatabase() {
    try {
        await sequelize.authenticate();
        console.log('Conexión a PostgreSQL establecida correctamente');
        
        await sequelize.sync();
        console.log('Base de datos sincronizada correctamente');
    } catch (error) {
        console.error('Error al inicializar la base de datos:', error);
        throw error;
    }
}

async function resetUserStatuses() {
    try {
        await User.update(
            {
                status: 'offline',
                last_seen: new Date()
            },
            {
                where: {}
            }
        );
        console.log('Estados de usuarios reiniciados correctamente');
    } catch (error) {
        console.error('Error al reiniciar estados de usuarios:', error);
        throw error;
    }
}

resetUserStatuses();

module.exports = {
    sequelize,
    User,
    Message,
    PrivateMessage,
    createUser,
    updateUserStatus,
    getAllUsers,
    getOnlineUsers,
    saveMessage,
    getRecentMessages,
    savePrivateMessage,
    getPrivateMessages,
    deleteUser,
    cleanOldMessages,
    initDatabase
};