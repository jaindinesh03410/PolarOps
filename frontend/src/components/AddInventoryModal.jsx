import { useState, useEffect } from 'react';
import { X, Package, AlertTriangle } from 'lucide-react';

const CATEGORIES = [
  { value: 'FUEL', label: 'Fuel', color: 'orange' },
  { value: 'FOOD', label: 'Food & Rations', color: 'green' },
  { value: 'MEDICAL', label: 'Medical Supplies', color: 'red' },
  { value: 'EQUIPMENT', label: 'Equipment & Tools', color: 'blue' }
];

export default function AddInventoryModal({ isOpen, onClose, onSubmit, stationId }) {
  const [formData, setFormData] = useState({
    item_name: '',
    category: 'FUEL',
    unit: 'liters',
    current_quantity: '',
    minimum_threshold: '',
    daily_consumption_rate: '',
    station_id: stationId || ''
  });
  
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Update station_id when prop changes
  useEffect(() => {
    if (stationId) {
      setFormData(prev => ({ ...prev, station_id: stationId }));
    }
  }, [stationId]);

  const validate = () => {
    const newErrors = {};
    
    if (!formData.item_name.trim()) {
      newErrors.item_name = 'Item name is required';
    }
    
    if (!formData.current_quantity || formData.current_quantity <= 0) {
      newErrors.current_quantity = 'Quantity must be greater than 0';
    }
    
    if (!formData.minimum_threshold || formData.minimum_threshold < 0) {
      newErrors.minimum_threshold = 'Threshold must be 0 or greater';
    }
    
    if (!formData.daily_consumption_rate || formData.daily_consumption_rate < 0) {
      newErrors.daily_consumption_rate = 'Consumption rate must be 0 or greater';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setSubmitting(true);
    try {
      await onSubmit({
        ...formData,
        current_quantity: parseFloat(formData.current_quantity),
        minimum_threshold: parseFloat(formData.minimum_threshold),
        daily_consumption_rate: parseFloat(formData.daily_consumption_rate)
      });
      
      // Reset form
      setFormData({
        item_name: '',
        category: 'FUEL',
        unit: 'liters',
        current_quantity: '',
        minimum_threshold: '',
        daily_consumption_rate: '',
        station_id: stationId
      });
      setErrors({});
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (field, value) => {
    console.log('Changing field:', field, 'to:', value); // Debug log
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Add Inventory Item</h2>
              <p className="text-sm text-gray-600">Add a new item to station inventory</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Alert */}
          {errors.submit && (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Item Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Item Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.item_name}
                onChange={(e) => handleChange('item_name', e.target.value)}
                placeholder="e.g., Diesel Fuel, Medical Supplies"
                className={`w-full px-4 py-3 border ${errors.item_name ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white`}
              />
              {errors.item_name && (
                <p className="mt-1 text-sm text-red-600">{errors.item_name}</p>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => handleChange('category', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => handleChange('unit', e.target.value)}
                placeholder="e.g., liters, kg, units"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white"
              />
            </div>

            {/* Current Quantity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Quantity <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.current_quantity}
                onChange={(e) => handleChange('current_quantity', e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 border ${errors.current_quantity ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white`}
              />
              {errors.current_quantity && (
                <p className="mt-1 text-sm text-red-600">{errors.current_quantity}</p>
              )}
            </div>

            {/* Minimum Threshold */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Threshold <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.minimum_threshold}
                onChange={(e) => handleChange('minimum_threshold', e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 border ${errors.minimum_threshold ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white`}
              />
              {errors.minimum_threshold && (
                <p className="mt-1 text-sm text-red-600">{errors.minimum_threshold}</p>
              )}
            </div>

            {/* Daily Consumption Rate */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Daily Consumption Rate <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.daily_consumption_rate}
                onChange={(e) => handleChange('daily_consumption_rate', e.target.value)}
                placeholder="0.00"
                className={`w-full px-4 py-3 border ${errors.daily_consumption_rate ? 'border-red-300' : 'border-gray-300'} rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900 bg-white`}
              />
              {errors.daily_consumption_rate && (
                <p className="mt-1 text-sm text-red-600">{errors.daily_consumption_rate}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Average amount consumed per day in {formData.unit}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-3 text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-lg font-medium shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Adding...' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
