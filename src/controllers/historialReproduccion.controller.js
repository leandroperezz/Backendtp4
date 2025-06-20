const { HistorialReproduccion, Bovino } = require('../models');


exports.getAllHistorialesReproduccion = async (req, res) => {
  try {
    const historiales = await HistorialReproduccion.findAll({
      include: [{ model: Bovino, as: 'bovino' }],
    });
    res.status(200).json(historiales); 
  } catch (error) {
    res.status(500).json({ message: error.message });  
  }
};


exports.createHistorialReproduccion = async (req, res) => {
  try {
    const { bovinoId, fechaEvento, tipoEvento } = req.body;
    if (!bovinoId || !fechaEvento || !tipoEvento) {
      return res.status(400).json({ message: 'BovinoId, fecha del evento y tipo de evento son requeridos.' }); // 
    }

    const newHistorial = await HistorialReproduccion.create(req.body);
    res.status(201).json(newHistorial);
  } catch (error) {
    res.status(400).json({ message: error.message }); 
  }
};

exports.getHistorialReproduccionById = async (req, res) => {
  try {
    const historial = await HistorialReproduccion.findByPk(req.params.id, {
      include: [{ model: Bovino, as: 'bovino' }],
    });
    if (!historial) {
      return res.status(404).json({ message: 'Historial de reproducción no encontrado' }); 
    }
    res.status(200).json(historial); 
  } catch (error) {
    res.status(500).json({ message: error.message }); 
  }
};

exports.updateHistorialReproduccion = async (req, res) => {
  try {
    const [updatedRows] = await HistorialReproduccion.update(req.body, {
      where: { id: req.params.id },
    });
    if (updatedRows === 0) {
      return res.status(404).json({ message: 'Historial de reproducción no encontrado o sin cambios' }); 
    }
    const updatedHistorial = await HistorialReproduccion.findByPk(req.params.id);
    res.status(200).json(updatedHistorial); 
  } catch (error) {
    res.status(400).json({ message: error.message }); 
  }
};

exports.deleteHistorialReproduccion = async (req, res) => {
  try {
    const deletedRows = await HistorialReproduccion.destroy({
      where: { id: req.params.id },
    });
    if (deletedRows === 0) {
      return res.status(404).json({ message: 'Historial de reproducción no encontrado' }); 
    }
    res.status(204).send(); // 
  } catch (error) {
    res.status(500).json({ message: error.message });  
  }
};
