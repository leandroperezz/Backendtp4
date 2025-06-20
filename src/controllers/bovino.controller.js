const { Bovino, Raza, User, ValorCaracteristica, CaracteristicaGenetica, HistorialReproduccion } = require('../models');
const { Op } = require('sequelize'); 
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 5 },
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Solo se permiten archivos de imagen (jpeg, jpg, png, gif)'));
  }
}).single('imagen');

exports.getAllBovinos = async (req, res) => {
  try {
    const { razaId, pesoMin, pesoMax, precioMin, precioMax, ubicacion } = req.query;
    const whereClause = {};

    if (razaId) {
      whereClause.razaId = razaId;
    }
    if (pesoMin && pesoMax) {
      whereClause.peso = { [Op.between]: [parseInt(pesoMin), parseInt(pesoMax)] };
    } else if (pesoMin) {
      whereClause.peso = { [Op.gte]: parseInt(pesoMin) };
    } else if (pesoMax) {
      whereClause.peso = { [Op.lte]: parseInt(pesoMax) };
    }
    if (precioMin && precioMax) {
      whereClause.precio = { [Op.between]: [parseInt(precioMin), parseInt(precioMax)] };
    } else if (precioMin) {
      whereClause.precio = { [Op.gte]: parseInt(precioMin) };
    } else if (precioMax) {
      whereClause.precio = { [Op.lte]: parseInt(precioMax) };
    }
    if (ubicacion) {
      whereClause.ubicacion = { [Op.like]: `%${ubicacion}%` };
    }

    const bovinos = await Bovino.findAll({
      where: whereClause,
      include: [
        { model: Raza, as: 'raza' },
        { model: User, as: 'propietario', attributes: { exclude: ['password'] } },
        { model: ValorCaracteristica, as: 'valoresDeCaracteristicas',
          include: { model: CaracteristicaGenetica, as: 'caracteristicaAsociada' }
        },
        { model: HistorialReproduccion, as: 'historialReproductivo' }
      ],
    });
    res.status(200).json(bovinos); 
  } catch (error) {
    console.error("Error al obtener bovinos (backend):", error);
    res.status(500).json({ message: error.message }); 
  }
};

exports.createBovino = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    try {
      const { edad, peso, precio, vendedorId } = req.body;
      if (!edad || !peso || !precio || !vendedorId) {
        if (req.file) { fs.unlinkSync(req.file.path); }
        return res.status(400).json({ message: 'Edad, peso, precio y vendedorId son requeridos.' });
      }

      const imagenUrl = req.file ? `/uploads/${req.file.filename}` : null;

      const newBovinoData = { ...req.body, imagenUrl };
      const newBovino = await Bovino.create(newBovinoData);
      res.status(201).json(newBovino);
    } catch (error) {
      if (req.file) { fs.unlinkSync(req.file.path); }
      console.error("Error al crear bovino (backend):", error.message);
      res.status(400).json({ message: error.message });
    }
  });
};

exports.getBovinoById = async (req, res) => {
  try {
    const bovino = await Bovino.findByPk(req.params.id, {
      include: [
        { model: Raza, as: 'raza' },
        { model: User, as: 'propietario', attributes: { exclude: ['password'] } },
        { model: ValorCaracteristica, as: 'valoresDeCaracteristicas',
          include: { model: CaracteristicaGenetica, as: 'caracteristicaAsociada' }
        },
        { model: HistorialReproduccion, as: 'historialReproductivo' }
      ],
    });
    if (!bovino) {
      return res.status(404).json({ message: 'Bovino no encontrado' }); 
    }
    res.status(200).json(bovino); 
  } catch (error) {
    console.error("Error al obtener bovino por ID (backend):", error.message);
    res.status(500).json({ message: error.message }); 
  }
};

exports.updateBovino = async (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      return res.status(400).json({ message: err.message });
    }
    try {
      const { id } = req.params;
      const bovinoToUpdate = await Bovino.findByPk(id);

      if (!bovinoToUpdate) {
        if (req.file) { fs.unlinkSync(req.file.path); }
        return res.status(404).json({ message: 'Bovino no encontrado' });
      }

      if (req.file) {
        if (bovinoToUpdate.imagenUrl) {
          const oldImagePath = path.join(__dirname, '..', '..', 'public', bovinoToUpdate.imagenUrl);
          if (fs.existsSync(oldImagePath)) { fs.unlinkSync(oldImagePath); }
        }
        req.body.imagenUrl = `/uploads/${req.file.filename}`;
      } else if (req.body.imagenUrl === '') {
        if (bovinoToUpdate.imagenUrl) {
          const oldImagePath = path.join(__dirname, '..', '..', 'public', bovinoToUpdate.imagenUrl);
          if (fs.existsSync(oldImagePath)) { fs.unlinkSync(oldImagePath); }
        }
        req.body.imagenUrl = null;
      }

      const [updatedRows] = await Bovino.update(req.body, {
        where: { id: id },
        individualHooks: true
      });

      if (updatedRows === 0) {
        if (req.file) { fs.unlinkSync(req.file.path); }
        return res.status(404).json({ message: 'Bovino no encontrado o sin cambios' });
      }

      const updatedBovino = await Bovino.findByPk(id, {
        include: [
          { model: Raza, as: 'raza' },
          { model: User, as: 'propietario', attributes: { exclude: ['password'] } },
          { model: ValorCaracteristica, as: 'valoresDeCaracteristicas', include: { model: CaracteristicaGenetica, as: 'caracteristicaAsociada' } },
          { model: HistorialReproduccion, as: 'historialReproductivo' }
        ],
      });
      res.status(200).json(updatedBovino);
    } catch (error) {
      if (err) { fs.unlinkSync(req.file.path); }
      console.error("Error al actualizar bovino (backend):", error.message);
      res.status(400).json({ message: error.message });
    }
  });
};


exports.deleteBovino = async (req, res) => { 
  try {
    const { id } = req.params;
    const bovinoToDelete = await Bovino.findByPk(id);

    if (!bovinoToDelete) {
      return res.status(404).json({ message: 'Bovino no encontrado' });
    }

    if (bovinoToDelete.imagenUrl) {
      const imagePath = path.join(__dirname, '..', '..', 'public', bovinoToDelete.imagenUrl);
      if (fs.existsSync(imagePath)) { fs.unlinkSync(imagePath); }
    }

    const deletedRows = await Bovino.destroy({ where: { id: id }, });
    if (deletedRows === 0) { return res.status(404).json({ message: 'Bovino no encontrado' }); }
    res.status(204).send();
  } catch (error) {
    console.error("Error al eliminar bovino (backend):", error.message);
    res.status(500).json({ message: error.message });
  }
};