// Optimized imports for better tree shaking
export { default as axios } from 'axios';

// Date utilities - import only what we need
export { format, parseISO, addDays, subDays, startOfMonth, endOfMonth } from 'date-fns';
export { default as dayjs } from 'dayjs';

// React Icons - import only specific icons
export { 
  FiHome, 
  FiUsers, 
  FiFileText, 
  FiDollarSign, 
  FiClock, 
  FiSettings, 
  FiLogOut,
  FiPlus,
  FiEdit,
  FiTrash2,
  FiEye,
  FiDownload,
  FiUpload,
  FiSearch,
  FiFilter,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiCheck,
  FiX
} from 'react-icons/fi';

// Lucide React - import only specific icons
export {
  Home,
  Users,
  FileText,
  DollarSign,
  Clock,
  Settings,
  LogOut,
  Plus,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  Calendar,
  Check,
  X
} from 'lucide-react';

// Chart components - lazy load for better performance
export const ChartComponents = {
  LineChart: () => import('recharts').then(module => ({ default: module.LineChart })),
  Line: () => import('recharts').then(module => ({ default: module.Line })),
  XAxis: () => import('recharts').then(module => ({ default: module.XAxis })),
  YAxis: () => import('recharts').then(module => ({ default: module.YAxis })),
  CartesianGrid: () => import('recharts').then(module => ({ default: module.CartesianGrid })),
  Tooltip: () => import('recharts').then(module => ({ default: module.Tooltip })),
  ResponsiveContainer: () => import('recharts').then(module => ({ default: module.ResponsiveContainer })),
  BarChart: () => import('recharts').then(module => ({ default: module.BarChart })),
  Bar: () => import('recharts').then(module => ({ default: module.Bar })),
  PieChart: () => import('recharts').then(module => ({ default: module.PieChart })),
  Pie: () => import('recharts').then(module => ({ default: module.Pie })),
  Cell: () => import('recharts').then(module => ({ default: module.Cell })),
};

// PDF utilities - lazy load
export const PDFUtils = {
  html2canvas: () => import('html2canvas'),
  html2pdf: () => import('html2pdf.js'),
  jsPDF: () => import('jspdf'),
};

// Excel utilities - lazy load
export const ExcelUtils = {
  read: () => import('xlsx').then(module => ({ default: module.read })),
  write: () => import('xlsx').then(module => ({ default: module.write })),
  utils: () => import('xlsx').then(module => ({ default: module.utils })),
};

// UUID utility
export { v4 as uuid } from 'uuid';

// JSZip utility
export { default as JSZip } from 'jszip';