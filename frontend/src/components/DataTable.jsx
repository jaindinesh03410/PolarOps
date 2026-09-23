import { motion } from 'framer-motion';

export default function DataTable({ columns, data, onRowClick }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="text-[12px] font-semibold text-slate-500 border-b border-slate-200 bg-slate-50 tracking-wider">
            {columns.map((col, idx) => (
              <th 
                key={idx} 
                className={`py-3 px-4 font-semibold ${
                  idx === 0 ? 'rounded-tl-md' : ''
                } ${
                  idx === columns.length - 1 ? 'rounded-tr-md' : ''
                } ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm text-slate-700">
          {data.map((row, rowIdx) => (
            <motion.tr
              key={rowIdx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: rowIdx * 0.03 }}
              onClick={() => onRowClick?.(row)}
              className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                onRowClick ? 'cursor-pointer' : ''
              }`}
            >
              {columns.map((col, colIdx) => (
                <td 
                  key={colIdx} 
                  className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''}`}
                >
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </motion.tr>
          ))}
          {data.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="py-8 text-center text-slate-400">
                No data available
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
