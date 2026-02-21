// L'URL est définie dans frontend/.env (variable EXPO_PUBLIC_API_URL)
// Sur émulateur : http://localhost:3000
// Sur téléphone physique : http://192.168.X.X:3000

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export default API_URL;
