process.env.MONGODB_URI = process.env.TEST_MONGODB_URI || 'mongodb://127.0.0.1:27017/taskmanager_e2e?retryWrites=false&directConnection=true';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || 'test_jwt_access_secret_12345';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test_jwt_refresh_secret_12345';
