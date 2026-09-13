const AuditLog = require('../models/AuditLog');

const auditLogger = (action, moduleName) => {
  return async (req, res, next) => {
    // We capture the original `res.send` to log only after successful request
    const originalSend = res.send;

    res.send = function (body) {
      res.send = originalSend;
      res.send(body);

      // Only log successful actions that change state
      if (res.statusCode >= 200 && res.statusCode < 300) {
        try {
          const userId = req.user ? req.user.id : null;
          if (userId) {
             const newLog = new AuditLog({
                 userId,
                 action: action,
                 module: moduleName
             });
             newLog.save().catch(err => console.error('Audit Log Save Error:', err));
          }
        } catch (error) {
          console.error('Audit Log Error:', error);
        }
      }
    };
    next();
  };
};

module.exports = auditLogger;
