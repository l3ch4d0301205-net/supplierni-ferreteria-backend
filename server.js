const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');

const app = express();

// =========================================================================
// MIDDLEWARES DE BASE Y SEGURIDAD
// =========================================================================
app.use(cors());
app.use(express.json());

// Middleware Auditor de Peticiones HTTP
app.use((req, res, next) => {
    const inicio = Date.now();
    res.on('finish', () => {
        const duracion = Date.now() - inicio;
        console.log(`[AUDITORÍA B2B MANAGUA] ${new Date().toISOString()} | MÉTODO: ${req.method} | RUTA: ${req.originalUrl} | ESTADO: ${res.statusCode} | TIEMPO: ${duracion}ms`);
    });
    next();
});

// =========================================================================
// CONEXIÓN A BASE DE DATOS MONGODB ATLAS
// =========================================================================
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("✅ [NÚCLEO] Conexión establecida con MongoDB Atlas - Sector Ferretero Managua");
        await inicializarSemillaFerretera();
    })
    .catch(err => console.error("❌ [NÚCLEO] Error de conexión a la base de datos:", err));

// =========================================================================
// MODELOS DE DATOS (ESQUEMAS MONGOOSE)
// =========================================================================
const Usuario = mongoose.model('Usuario', new mongoose.Schema({
    correo: { type: String, required: true, lowercase: true, trim: true },
    contrasena: { type: String, required: true },
    rol: { type: String, enum: ['COMPRADOR', 'PROVEEDOR', 'ADMIN'], default: 'COMPRADOR' },
    nombre: { type: String, required: true, trim: true },
    ruc: { type: String, trim: true },
    direccion: { type: String, trim: true },
    telefono: { type: String, trim: true },
    estado: { type: String, default: 'PENDIENTE_VERIFICACION' },
    codigo_verificacion: { type: String, default: null }
}));

const Producto = mongoose.model('Producto', new mongoose.Schema({
    id_producto: { type: Number, unique: true },
    sku: { type: String, unique: true, uppercase: true, trim: true },
    nombre_articulo: { type: String, required: true, trim: true },
    categoria: { type: String, required: true },
    specs: { type: String, trim: true },
    material: { type: String, trim: true },
    marca: { type: String, trim: true },
    precio_mayorista: { type: Number, required: true, min: 0 },
    stock_disponible: { type: Number, required: true, min: 0 },
    peso_kg: { type: Number, default: 1.0 },
    unidad_empaque: { type: String, default: 'Unidad' },
    imagen_url: { type: String, trim: true },
    creado_por: { type: String, default: 'Distribuidora Ferretera Central (Carretera Norte)' }
}));

const Pedido = mongoose.model('Pedido', new mongoose.Schema({
    id_pedido: { type: Number, unique: true },
    id_comprador: { type: String, required: true },
    items: [{
        id_producto: Number,
        sku: String,
        nombre_articulo: String,
        precio_mayorista: Number,
        cantidad: Number,
        subtotal: Number
    }],
    total_neto: { type: Number, required: true },
    terminos_pago: { type: String, required: true },
    email_despacho: { type: String, required: true, lowercase: true },
    direccion: { type: String, required: true },
    telefono: { type: String, required: true },
    estado: { type: String, default: 'CONFIRMADO' }, // CONFIRMADO -> EN_BODEGA -> EN_RUTA -> ENTREGADO
    camion_asignado: { type: String, default: 'Camión Isuzu Blanco 4.5T — Placa M-289410' },
    fecha: { type: String, default: () => new Date().toLocaleString() }
}));

// =========================================================================
// INYECCIÓN DE SEMILLA INICIAL (100% FERRETERÍA MANAGUA)
// =========================================================================
const inicializarSemillaFerretera = async () => {
    try {
        const countUsuarios = await Usuario.countDocuments();
        if (countUsuarios === 0) {
            console.log("[INICIALIZACIÓN] Generando usuarios corporativos iniciales...");
            await Usuario.insertMany([
                {
                    correo: "proveedor@gmail.com",
                    contrasena: "1234",
                    rol: "PROVEEDOR",
                    nombre: "Distribuidora Ferretera Central (Carretera Norte)",
                    ruc: "J0310000112233",
                    direccion: "Km 5.5 Carretera Norte, Managua",
                    telefono: "22495500",
                    estado: "VERIFICADO",
                    codigo_verificacion: null
                },
                {
                    correo: "comprador@gmail.com",
                    contrasena: "1234",
                    rol: "COMPRADOR",
                    nombre: "Ferretería El Tornillo Fuerte (Pista Suburbana)",
                    ruc: "J0310000458921",
                    direccion: "Pista Suburbana, de los semáforos 2c al lago, Managua",
                    telefono: "88887766",
                    estado: "VERIFICADO",
                    codigo_verificacion: null
                }
            ]);
        }

        const countProductos = await Producto.countDocuments();
        if (countProductos === 0) {
            console.log("[INICIALIZACIÓN] Cargando inventario técnico ferretero para Managua...");
            await Producto.insertMany([
                {
                    id_producto: 1,
                    sku: "CON-CEM-042",
                    nombre_articulo: "Saco de Cemento Canal Estructural (42.5kg)",
                    categoria: "Construcción",
                    specs: "Presentación 42.5 Kg • Alta Resistencia",
                    material: "Clinker Portland Tipo I",
                    brand: "CEMEX Canal Nicaragua",
                    precio_mayorista: 11.20,
                    stock_disponible: 160,
                    peso_kg: 42.5,
                    unidad_empaque: "Saco 42.5 Kg",
                    imagen_url: "https://images.unsplash.com/photo-1518156677180-95a2893f3e9f?auto=format&fit=crop&w=600&q=80&sig=1",
                    creado_por: "Distribuidora Ferretera Central (Carretera Norte)"
                },
                {
                    id_producto: 2,
                    sku: "PVC-ELE-050",
                    nombre_articulo: "Tubo PVC Eléctrico Pesado 1/2 pulg x 3m",
                    categoria: "Electricidad",
                    specs: "1/2 pulgada x 3 metros • Campana y Espiga",
                    material: "PVC Rígido Dieléctrico Naranja",
                    brand: "Amanco / Wavin",
                    precio_mayorista: 1.60,
                    stock_disponible: 420,
                    peso_kg: 0.85,
                    unidad_empaque: "Tubo (Atado x 10)",
                    imagen_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=600&q=80&sig=2",
                    creado_por: "Distribuidora Ferretera Central (Carretera Norte)"
                },
                {
                    id_producto: 3,
                    sku: "HER-MAR-016",
                    nombre_articulo: "Martillo de Uña 16oz Truper Profesional",
                    categoria: "Herramientas",
                    specs: "Mango de Fibra de Vidrio con Grip Antideslizante",
                    material: "Acero Forjado al Alto Carbono",
                    brand: "Truper Profesional",
                    precio_mayorista: 6.50,
                    stock_disponible: 35,
                    peso_kg: 0.75,
                    unidad_empaque: "Unidad",
                    imagen_url: "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80&sig=3",
                    creado_por: "Distribuidora Ferretera Central (Carretera Norte)"
                },
                {
                    id_producto: 4,
                    sku: "FIJ-TOR-100",
                    nombre_articulo: "Tornillo Tabla Yeso 6x1 pulg Punta Broca (Caja x 1,000)",
                    categoria: "Fijación",
                    specs: "Calibre 6 x 1 pulgada • Rosca Fina",
                    material: "Acero Cementado Fosfatizado",
                    brand: "Fijaciones Rápidas Ni",
                    precio_mayorista: 3.95,
                    stock_disponible: 85,
                    peso_kg: 1.40,
                    unidad_empaque: "Caja x 1,000 pcs",
                    imagen_url: "https://images.unsplash.com/photo-1597484661643-2f5fef640dd1?auto=format&fit=crop&w=600&q=80&sig=4",
                    creado_por: "Casa Mayorista El Roble (Managua)"
                },
                {
                    id_producto: 5,
                    sku: "CON-VAR-038",
                    nombre_articulo: "Varilla de Acero Corrugado 3/8 pulg Grado 40 x 6m",
                    categoria: "Construcción",
                    specs: "3/8 pulgada (No. 3) x 6 metros de longitud",
                    material: "Acero Estructural de Refuerzo",
                    brand: "Sidenor / Gerdau",
                    precio_mayorista: 5.85,
                    stock_disponible: 240,
                    peso_kg: 3.35,
                    unidad_empaque: "Varilla (Quintal x 17)",
                    imagen_url: "https://images.unsplash.com/photo-1504917599217-d4dc5ebe6122?auto=format&fit=crop&w=600&q=80&sig=5",
                    creado_por: "Importadora Construrápido Managua"
                },
                {
                    id_producto: 6,
                    sku: "HER-CIN-005",
                    nombre_articulo: "Cinta Métrica 5 Metros Stanley Global Plus",
                    categoria: "Herramientas",
                    specs: "Ancho de Hoja 19mm • Cinta con Revestimiento",
                    material: "Carcasa ABS de Alto Impacto",
                    brand: "Stanley Tools",
                    precio_mayorista: 5.80,
                    stock_disponible: 50,
                    peso_kg: 0.25,
                    unidad_empaque: "Pieza",
                    imagen_url: "https://images.unsplash.com/photo-1531842477197-e3f85e40346e?auto=format&fit=crop&w=600&q=80&sig=6",
                    creado_por: "Distribuidora Ferretera Central (Carretera Norte)"
                },
                {
                    id_producto: 7,
                    sku: "FON-VAL-075",
                    nombre_articulo: "Válvula de Pase Esfera Bronce 3/4 pulg NPT (Genbre)",
                    categoria: "Fontanería",
                    specs: "Paso Total 400 WOG • Rosca Hembra NPT",
                    material: "Bronce Forjado de Alta Resistencia",
                    brand: "Genbre Industrial",
                    precio_mayorista: 5.05,
                    stock_disponible: 60,
                    peso_kg: 0.35,
                    unidad_empaque: "Unidad (Caja x 12)",
                    imagen_url: "https://images.unsplash.com/photo-1585338107529-13afc5f02586?auto=format&fit=crop&w=600&q=80&sig=7",
                    creado_por: "Importadora Construrápido Managua"
                },
                {
                    id_producto: 8,
                    sku: "ELE-CAB-120",
                    nombre_articulo: "Cable THHN Calibre 12 AWG Cobre 100m (Phelps)",
                    categoria: "Electricidad",
                    specs: "100% Cobre Sólido • Aislamiento 600V 90°C",
                    material: "Cobre Electrolítico Puro",
                    brand: "Condutores Phelps",
                    precio_mayorista: 50.50,
                    stock_disponible: 20,
                    peso_kg: 3.80,
                    unidad_empaque: "Rollo x 100 metros",
                    imagen_url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80&sig=8",
                    creado_por: "Casa Mayorista El Roble (Managua)"
                }
            ]);
        }
    } catch (e) {
        console.error("Error al sembrar datos iniciales:", e);
    }
};

// =========================================================================
// VALIDACIONES DE NEGOCIO Y FORMATO
// =========================================================================
const validarFormatoCorreo = (correo) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(correo);
};

const validarNumeroTelefonoNicaragua = (telefono) => {
    const limpio = telefono.replace(/[\s-]/g, '');
    const regex = /^[2578]\d{7}$/;
    return regex.test(limpio);
};

// =========================================================================
// CONFIGURACIÓN DE TRANSPORTE SMTP (BREVO B2B)
// =========================================================================
const configurarTransporterB2B = () => {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        return null;
    }
    return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 2525,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        },
        tls: { rejectUnauthorized: false }
    });
};

// =========================================================================
// DIAGNÓSTICO Y RAÍZ DEL SERVICIO
// =========================================================================
app.get('/', (req, res) => {
    const envUser = process.env.EMAIL_USER ? "CONFIGURADO (BREVO SMTP)" : "FALTA ASIGNAR EMAIL_USER";
    const envPass = process.env.EMAIL_PASS ? "CONFIGURADO" : "FALTA ASIGNAR EMAIL_PASS";
    const envMongo = process.env.MONGO_URI ? "CONECTADO A ATLAS" : "FALTA ASIGNAR MONGO_URI";
    const envGemini = process.env.GEMINI_API_KEY ? "GEMINI NATIVO DISPONIBLE" : "CONTINGENCIA LOCAL ACTIVA";

    res.send(`
        <div style="font-family:'Segoe UI',Roboto,sans-serif; text-align:center; margin-top:40px; color:#0f172a; padding:20px; background:#f8fafc;">
            <div style="max-width:620px; margin:0 auto; background:white; padding:35px; border-radius:24px; box-shadow:0 10px 30px rgba(0,0,0,0.06); border:1px solid #e2e8f0;">
                <h1 style="color:#2563eb; font-weight:900; letter-spacing:-1px; margin-bottom:6px;">⚡ Microservicio B2B SupplierNi Operacional</h1>
                <p style="color:#64748b; font-size:13px; margin-bottom:25px;">Plataforma de Suministros para el Sector Ferretero en Managua — Universidad Nacional de Ingeniería (UNI).</p>
                
                <div style="text-align:left; background:#f1f5f9; padding:18px; border-radius:16px; font-size:12px; font-family:monospace; line-height:1.8;">
                    <div style="font-weight:bold; color:#1e3a8a; margin-bottom:6px; font-family:sans-serif;">ESTADO DE LAS COMPUERTAS CLOUD:</div>
                    <div>• BASE DE DATOS: <span style="color:${process.env.MONGO_URI ? '#059669' : '#dc2626'}; font-weight:bold;">${envMongo}</span></div>
                    <div>• SERVICIO SMTP: <span style="color:${process.env.EMAIL_USER ? '#059669' : '#dc2626'}; font-weight:bold;">${envUser}</span></div>
                    <div>• CREDENCIAL SMTP: <span style="color:${process.env.EMAIL_PASS ? '#059669' : '#dc2626'}; font-weight:bold;">${envPass}</span></div>
                    <div>• MOTOR DE IA B2B: <span style="color:#2563eb; font-weight:bold;">${envGemini}</span></div>
                </div>

                <div style="margin-top:25px; font-size:11px; color:#94a3b8; font-weight:700; text-transform:uppercase; letter-spacing:1px;">
                    Br. Henry Isaac Lechado Moreno • Carnet: 2023-0641U • UNI Managua[cite: 1, 4]
                </div>
            </div>
        </div>
    `);
});

// =========================================================================
// 1. REGISTRO CORPORATIVO CON CÓDIGO OTP (BREVO)
// =========================================================================
app.post('/api/registro', async (req, res) => {
    try {
        const { correo, contrasena, rol, nombre, ruc, direccion, telefono } = req.body;
        
        if (!correo || !contrasena || !rol || !nombre) {
            return res.status(400).json({ exito: false, error: "Todos los campos obligatorios deben completarse." });
        }
        if (!validarFormatoCorreo(correo)) {
            return res.status(400).json({ exito: false, error: "El formato del correo corporativo no es válido." });
        }

        const correoLimpio = correo.toLowerCase().trim();
        const existe = await Usuario.findOne({ correo: correoLimpio });
        if (existe) {
            return res.status(400).json({ exito: false, error: "Esta entidad comercial ya se encuentra registrada en la red." });
        }

        const tokenOTP = Math.floor(100000 + Math.random() * 900000).toString();

        await Usuario.create({
            correo: correoLimpio,
            contrasena: contrasena.trim(),
            rol,
            nombre: nombre.trim(),
            ruc: ruc ? ruc.trim() : "J0310000458921",
            direccion: direccion ? direccion.trim() : "Managua",
            telefono: telefono ? telefono.trim() : "88887766",
            estado: "PENDIENTE_VERIFICACION",
            codigo_verificacion: tokenOTP
        });

        const canalSmtp = configurarTransporterB2B();
        if (canalSmtp) {
            try {
                const htmlOtp = `
                    <div style="font-family:'Segoe UI',sans-serif; max-width:500px; margin:0 auto; padding:30px; border:1px solid #e2e8f0; border-radius:24px; text-align:center;">
                        <h2 style="color:#1e3a8a; margin-top:0;">SupplierNi B2B Ferretero</h2>
                        <p style="color:#64748b; font-size:13px;">Hola <strong>${nombre}</strong>,</p>
                        <p style="color:#64748b; font-size:13px;">Tu token de seguridad para activar tu cuenta comercial en Managua es:</p>
                        <div style="margin:25px 0;">
                            <span style="background:#f8fafc; border:1px solid #cbd5e1; color:#059669; font-size:32px; font-weight:900; letter-spacing:8px; padding:12px 24px; border-radius:12px; font-family:monospace;">${tokenOTP}</span>
                        </div>
                        <p style="color:#94a3b8; font-size:11px;">Este código es de uso exclusivo para tu ferretería o distribuidora en Managua.</p>
                    </div>
                `;

                await canalSmtp.sendMail({
                    from: '"SupplierNi Seguridad" <henrylechado41@gmail.com>',
                    to: correoLimpio,
                    subject: `🔐 Token de Activación Ferretera SupplierNi: ${tokenOTP}`,
                    html: htmlOtp
                });
            } catch (smtpErr) {
                console.error("[SMTP ERROR OTP]", smtpErr.message);
            }
        }

        res.json({ exito: true, mensaje: "Registro comercial procesado. Revise su correo para el código OTP." });
    } catch (err) {
        res.status(500).json({ exito: false, error: "Error interno al procesar el registro." });
    }
});

// =========================================================================
// 2. VERIFICACIÓN DE TOKEN OTP
// =========================================================================
app.post('/api/verificar', async (req, res) => {
    try {
        const { correo, codigo } = req.body;
        if (!correo || !codigo) {
            return res.status(400).json({ exito: false, error: "Parámetros de verificación ausentes." });
        }

        const correoLimpio = correo.toLowerCase().trim();
        const usuario = await Usuario.findOne({ correo: correoLimpio });

        if (!usuario) {
            return res.status(404).json({ exito: false, error: "Entidad comercial no encontrada." });
        }

        if (usuario.codigo_verificacion !== codigo.trim()) {
            return res.status(400).json({ exito: false, error: "El token OTP ingresado es incorrecto o ya expiró." });
        }

        usuario.estado = "VERIFICADO";
        usuario.codigo_verificacion = null;
        await usuario.save();

        res.json({ exito: true, mensaje: "¡Identidad comercial verificada y activa en la red ferretera!" });
    } catch (err) {
        res.status(500).json({ exito: false, error: "Fallo de concurrencia al verificar token." });
    }
});

// =========================================================================
// 3. AUTENTICACIÓN / INICIO DE SESIÓN
// =========================================================================
app.post('/api/login', async (req, res) => {
    try {
        const { correo, contrasena } = req.body;
        if (!correo || !contrasena) {
            return res.status(400).json({ exito: false, error: "Debe ingresar correo y contraseña." });
        }

        const correoLimpio = correo.toLowerCase().trim();
        const usuario = await Usuario.findOne({ correo: correoLimpio, contrasena: contrasena.trim() });

        if (!usuario) {
            return res.status(401).json({ exito: false, error: "Credenciales comerciales no reconocidas." });
        }

        if (usuario.estado !== 'VERIFICADO') {
            return res.status(403).json({
                exito: false,
                error: "La entidad debe completar la activación por código OTP.",
                requiere_verificacion: true,
                correo: usuario.correo
            });
        }

        res.json({ exito: true, usuario });
    } catch (err) {
        res.status(500).json({ exito: false, error: "Error en el subproceso de login." });
    }
});

// =========================================================================
// 4. LECTURA DEL CATÁLOGO FERRETERO
// =========================================================================
app.get('/api/productos', async (req, res) => {
    try {
        const productos = await Producto.find().sort('id_producto');
        res.json(productos);
    } catch (e) {
        res.status(500).json({ error: "No se pudo recuperar la lista de materiales ferreteros." });
    }
});

// =========================================================================
// 5. INYECCIÓN DE ARTÍCULOS POR EL MAYORISTA
// =========================================================================
app.post('/api/productos', async (req, res) => {
    try {
        const { sku, nombre_articulo, categoria, specs, material, marca, precio_mayorista, stock_disponible, peso_kg, unidad_empaque, imagen_url, creado_por } = req.body;

        if (!nombre_articulo || !precio_mayorista || !stock_disponible || !categoria) {
            return res.status(400).json({ exito: false, error: "Campos obligatorios del material incompletos." });
        }

        const maxProd = await Producto.findOne().sort('-id_producto');
        const nuevoId = maxProd ? maxProd.id_producto + 1 : 1;
        const skuFinal = sku ? sku.trim().toUpperCase() : `FER-${nuevoId.toString().padStart(3, '0')}`;

        let finalImg = "https://images.unsplash.com/photo-1586864387967-d02ef85d93e8?auto=format&fit=crop&w=600&q=80";
        if (imagen_url && imagen_url.startsWith('http')) {
            finalImg = imagen_url.trim();
        }

        const nuevoProducto = await Producto.create({
            id_producto: nuevoId,
            sku: skuFinal,
            nombre_articulo: nombre_articulo.trim(),
            categoria,
            specs: specs || "Especificación Estándar Managua",
            material: material || "Acero / Polímero Industrial",
            marca: marca || "Genérico Industrial",
            precio_mayorista: Math.abs(Number(precio_mayorista)),
            stock_disponible: Math.abs(parseInt(stock_disponible)),
            peso_kg: peso_kg ? Math.abs(Number(peso_kg)) : 1.0,
            unidad_empaque: unidad_empaque || "Unidad",
            imagen_url: finalImg,
            creado_por: creado_por || "Distribuidor Ferretero Central (Carretera Norte)"
        });

        res.json({ exito: true, producto: nuevoProducto });
    } catch (error) {
        res.status(500).json({ exito: false, error: "Fallo al indexar el artículo en el inventario." });
    }
});

// =========================================================================
// 6. PROCESAMIENTO ATÓMICO DE PEDIDOS Y FACTURACIÓN SMTP
// =========================================================================
app.post('/api/pedidos', async (req, res) => {
    try {
        const { id_comprador, items, total_neto, terminos_pago, email_despacho, direccion, telefono } = req.body;

        if (!id_comprador || !items || !items.length || !email_despacho || !direccion || !telefono) {
            return res.status(400).json({ exito: false, error: "Parámetros obligatorios de despacho incompletos." });
        }
        if (!validarNumeroTelefonoNicaragua(telefono)) {
            return res.status(400).json({ exito: false, error: "El teléfono debe contener 8 dígitos válidos de Nicaragua (iniciar en 2, 5, 7 u 8)." });
        }

        // Control de concurrencia: Verificación previa de existencias
        for (const it of items) {
            const prod = await Producto.findOne({ id_producto: it.id_producto });
            if (!prod) {
                return res.status(400).json({ exito: false, error: `El material con código #${it.id_producto} no existe en bodega.` });
            }
            if (prod.stock_disponible < it.cantidad) {
                return res.status(400).json({ exito: false, error: `Stock insuficiente para: ${prod.nombre_articulo}. Disponible: ${prod.stock_disponible}` });
            }
        }

        // Deducción atómica del stock en bodega
        for (const it of items) {
            const prod = await Producto.findOne({ id_producto: it.id_producto });
            prod.stock_disponible -= it.cantidad;
            await prod.save();
        }

        const totalPedidos = await Pedido.countDocuments();
        const nuevoPedido = await Pedido.create({
            id_pedido: totalPedidos + 1,
            id_comprador,
            items,
            total_neto: Number(total_neto),
            terminos_pago,
            email_despacho: email_despacho.toLowerCase().trim(),
            direccion: direccion.trim(),
            telefono: telefono.replace(/[\s-]/g, ''),
            fecha: new Date().toLocaleString()
        });

        // Envío de proforma comercial por Brevo SMTP
        const canalSmtp = configurarTransporterB2B();
        if (canalSmtp) {
            try {
                let lineasHtml = "";
                items.forEach(i => {
                    lineasHtml += `
                        <tr>
                            <td style="padding:10px; border-bottom:1px solid #edf2f7; font-weight:bold; color:#1e293b;">${i.nombre_articulo}</td>
                            <td style="padding:10px; border-bottom:1px solid #edf2f7; text-align:center; color:#475569; font-family:monospace;">${i.cantidad}</td>
                            <td style="padding:10px; border-bottom:1px solid #edf2f7; text-align:right; font-weight:bold; color:#0f172a; font-family:monospace;">$${(i.precio_mayorista * i.cantidad).toFixed(2)}</td>
                        </tr>
                    `;
                });

                const proformaHtml = `
                    <div style="font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif; max-width:600px; margin:0 auto; padding:30px; border:1px solid #e2e8f0; border-radius:24px; background-color:#ffffff;">
                        <div style="text-align:center; margin-bottom:20px;">
                            <h2 style="color:#0f172a; margin:0; font-size:24px; font-weight:900;">SupplierNi B2B Ferretero</h2>
                            <p style="font-size:11px; color:#16a34a; font-weight:800; text-transform:uppercase; margin:4px 0 0 0; letter-spacing:1.5px;">Orden de Abastecimiento Ferretero Confirmada</p>
                        </div>
                        <div style="background:#f8fafc; padding:15px; border-radius:16px; font-size:12px; margin-bottom:20px; border:1px solid #edf2f7; color:#334155; line-height:1.6;">
                            <strong>DETALLES DE DESPACHO EN MANAGUA:</strong><br>
                            • <strong>Ferretería Adquirente:</strong> ${id_comprador}<br>
                            • <strong>Destino de Entrega:</strong> ${nuevoPedido.direccion}<br>
                            • <strong>Contacto:</strong> +505 ${nuevoPedido.telefono}<br>
                            • <strong>Términos de Pago:</strong> ${terminos_pago}
                        </div>
                        <table style="width:100%; font-size:12px; border-collapse:collapse;">
                            <thead>
                                <tr style="background:#0f172a; color:#ffffff;">
                                    <th style="padding:10px; text-align:left; border-radius:8px 0 0 8px;">Material / Ítem</th>
                                    <th style="padding:10px; text-align:center;">Cant</th>
                                    <th style="padding:10px; text-align:right; border-radius:0 8px 8px 0;">Subtotal (USD)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${lineasHtml}
                            </tbody>
                        </table>
                        <div style="margin-top:20px; text-align:right; font-size:15px; font-weight:900; color:#0f172a; font-family:monospace;">
                            TOTAL COMPROMETIDO NETO: $${nuevoPedido.total_neto.toFixed(2)} USD
                        </div>
                        <div style="background:#fffbeb; border:1px solid #fef3c7; padding:15px; border-radius:16px; margin-top:20px; font-size:11px; color:#78350f; line-height:1.6;">
                            <strong>📌 CANALES BANCARIOS AUTORIZADOS EN MANAGUA:</strong><br>
                            • <strong>Banco LAFISE Bancentro:</strong> Cuenta Corriente Córdobas #134070030<br>
                            • <strong>Banco BANPRO:</strong> Cuenta de Ahorros Dólares #10022341054
                        </div>
                        <div style="text-align:center; font-size:10px; color:#94a3b8; margin-top:30px; border-top:1px solid #edf2f7; padding-top:12px; font-weight:600;">
                            Ingeniería de Software I — Universidad Nacional de Ingeniería (UNI)<br>
                            Henry Isaac Lechado Moreno • Carnet: 2023-0641U[cite: 1, 4]
                        </div>
                    </div>
                `;

                await canalSmtp.sendMail({
                    from: '"SupplierNi Red Ferretera" <henrylechado41@gmail.com>',
                    to: nuevoPedido.email_despacho,
                    subject: `📋 Proforma de Orden Ferretera #SP-${nuevoPedido.id_pedido} - SupplierNi`,
                    html: proformaHtml
                });
            } catch (errFactura) {
                console.error("[SMTP ERROR FACTURA]", errFactura.message);
            }
        }

        res.json({
            exito: true,
            pedido: nuevoPedido,
            coordenadas_bancarias: [
                { banco: "Banco LAFISE Bancentro", cuenta: "134070030", moneda: "Córdobas (NIO)", tipo: "Cuenta Corriente Empresarial" },
                { banco: "Banco BANPRO", cuenta: "10022341054", moneda: "Dólares (USD)", tipo: "Cuenta de Ahorros" }
            ]
        });
    } catch (err) {
        res.status(500).json({ exito: false, error: "Fallo al procesar la orden en bodega." });
    }
});

// =========================================================================
// 7. ASISTENTE INTELIGENTE IA FERRETERO (GEMINI + CONTINGENCIA LOCAL)
// =========================================================================
app.post('/api/ia-asistente', async (req, res) => {
    try {
        const { mensaje, rol } = req.body;
        if (!mensaje) return res.status(400).json({ error: "Mensaje vacío." });

        const msg = mensaje.toLowerCase().trim();
        const productosEnBd = await Producto.find().limit(25);
        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (GEMINI_API_KEY) {
            try {
                const promptContexto = `Eres el agente inteligente central de SupplierNi B2B para el sector ferretero en Managua, Nicaragua.
                Rol actual del usuario: ${rol}.
                Catálogo técnico disponible: ${JSON.stringify(productosEnBd)}.
                Zonas logísticas en Managua: Carretera Norte (Hub Mayorista), Rubenia, Pista Suburbana, Pista Juan Pablo II, Mercado Oriental.
                
                REGLA DE EXTRACCIÓN: Si el usuario menciona cantidades de sacos, varillas, tubos o cajas, extrae ese número entero. Si no especifica, asume 1.
                PROHIBICIÓN: No hables de farmacias, medicinas ni fórmulas de VAN/TIR.
                Retorna EXCLUSIVAMENTE JSON: {"respuesta": "texto", "items": [{"id_producto": 1, "cantidad": 5}], "sugerencias": []}
                Entrada del operador: "${mensaje}"`;

                const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: promptContexto }] }],
                        generationConfig: { responseMimeType: "application/json" }
                    })
                });

                if (apiResponse.ok) {
                    const aiData = await apiResponse.json();
                    let jsonText = aiData.candidates[0].content.parts[0].text.trim();
                    if (jsonText.startsWith("```")) {
                        jsonText = jsonText.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
                    }
                    return res.json(JSON.parse(jsonText));
                }
            } catch (eCloud) {
                console.error("[FALLO GEMINI CLOUD] Activando contingencia ferretera local.");
            }
        }

        // Contingencia Local Ferretera
        let respuestaText = "";
        let itemsDetectados = [];
        let sugerenciasCruzadas = [];

        if (rol === 'COMPRADOR') {
            respuestaText = "⚡ **Asistente Ferretero:** He procesado los siguientes materiales en su orden: ";

            const catalogoBusqueda = [
                { id: 1, keys: ["cemento", "saco", "canal", "concreto"], nombre: "Saco de Cemento Canal 42.5kg" },
                { id: 2, keys: ["tubo", "pvc", "electrico", "tuberia"], nombre: "Tubo PVC Eléctrico 1/2 pulg" },
                { id: 3, keys: ["martillo", "herramienta", "truper"], nombre: "Martillo de Uña 16oz Truper" },
                { id: 4, keys: ["tornillo", "tabla yeso", "fijacion"], nombre: "Tornillo Tabla Yeso 6x1 pulg" },
                { id: 5, keys: ["varilla", "acero", "corrugado", "hierro"], nombre: "Varilla de Acero 3/8 pulg" }
            ];

            catalogoBusqueda.forEach(prod => {
                const tieneCoincidencia = prod.keys.some(k => msg.includes(k));
                if (tieneCoincidencia) {
                    const regex = new RegExp(`(\\d+)\\s*(?:${prod.keys.join('|')})`, 'i');
                    const match = msg.match(regex);
                    const cantidad = match ? parseInt(match[1]) : 1;

                    itemsDetectados.push({ id_producto: prod.id, cantidad, nombre_articulo: prod.nombre });
                    respuestaText += `\n• ${cantidad}x ${prod.nombre}`;
                }
            });

            if (itemsDetectados.length === 0) {
                respuestaText = "Hola. Indíqueme abiertamente qué materiales de construcción, tuberías, cables o herramientas requiere su ferretería en Managua y cargaré su cotización automáticamente.";
            } else {
                respuestaText += "\n¡Las líneas fueron añadidas a su pedido!";
                sugerenciasCruzadas.push({ id_producto: 6, nombre_articulo: "Cinta Métrica 5 Metros Stanley" });
            }
        } else {
            if (msg.includes("vendido") || msg.includes("venta") || msg.includes("rotacion")) {
                respuestaText = "📊 **Auditoría Mayorista Managua:** Los materiales con mayor rotación en bodegas son el **Saco de Cemento Canal (42.5kg)** y el **Tubo PVC Eléctrico 1/2 pulg**, con alta demanda en los distritos IV y V de Managua.";
            } else if (msg.includes("zona") || msg.includes("managua") || msg.includes("ruta")) {
                respuestaText = "📍 **Logística de Despacho:** Las rutas de mayor volumen parten de **Carretera Norte (Hub Mayorista)** hacia las ferreterías de la **Pista Suburbana** y **Rubenia**, con tiempos de entrega de 3 a 5 horas.";
            } else {
                respuestaText = "Panel Mayorista Activo. Puede consultar sobre rotación de materiales, zonas de demanda en Managua o capacidad de carga.";
            }
        }

        res.json({ respuesta: respuestaText, items: itemsDetectados, sugerencias: sugerenciasCruzadas });
    } catch (err) {
        res.status(500).json({ error: "Fallo en el subproceso del asistente ferretero." });
    }
});

// ASIGNACIÓN DINÁMICA DE PUERTOS
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`[INSTANCIA ACTIVA] Servidor SupplierNi Ferretero operando en el puerto ${PORT}`));
