import { isHttpUrl } from '../../utils/validation.js';


// Only real web addresses are ever loaded as images (never javascript:, data: ...).
export const isSafeImage = (value) => typeof value === 'string' && value.trim() !== '' && isHttpUrl(value.trim());
