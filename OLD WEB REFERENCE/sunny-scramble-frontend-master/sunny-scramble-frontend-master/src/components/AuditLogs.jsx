import { useState, useEffect } from 'react';
import API from '../services/api';
import Pagination from './Pagination';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchLogs = async () => {
    try {
      const res = await API.get('/audit-logs');
      setLogs(res.data);
    } catch { setError('Failed to fetch audit logs'); }
  };

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Audit Logs</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review system activity and user actions</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm font-medium">{error}</div>}

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <th className="p-4">Timestamp</th>
              <th className="p-4">User</th>
              <th className="p-4">Module</th>
              <th className="p-4">Action Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              (() => {
                const totalPages = Math.ceil(logs.length / itemsPerPage);
                const startIndex = (currentPage - 1) * itemsPerPage;
                const paginatedLogs = logs.slice(startIndex, startIndex + itemsPerPage);
                
                return paginatedLogs.map((log) => (
                  <tr key={log._id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-sm font-medium text-slate-800">
                      {log.userId ? log.userId.fullName : 'System'}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.module}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {log.action}
                    </td>
                  </tr>
                ));
              })()
            ) : <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-sm">No audit logs found.</td></tr>}
          </tbody>
        </table>
        
        {logs.length > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={Math.ceil(logs.length / itemsPerPage)}
            itemsPerPage={itemsPerPage}
            totalItems={logs.length}
            startIndex={(currentPage - 1) * itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={(val) => { setItemsPerPage(val); setCurrentPage(1); }}
          />
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
