# Uber Backend API Documentation

## User Registration Endpoint

### POST /user/register

Register a new user in the system.

#### Request Body

```json
{
  "fullname": {
    "firstname": "string",
    "lastname": "string"
  },
  "email": "string",
  "password": "string"
}
```

#### Validation Rules
- Email must be a valid email address
- Firstname must be at least 3 characters long
- Password must be at least 6 characters long

#### Response

**Success Response (201 Created)**
```json
{
  "token": "string",
  "user": {
    "firstname": "string",
    "lastname": "string",
    "email": "string",
    "password": "string (hashed)"
  }
}
```

**Error Response (400 Bad Request)**
```json
{
  "errors": [
    {
      "msg": "string",
      "param": "string",
      "location": "string"
    }
  ]
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

#### Notes
- The password is automatically hashed before being stored in the database
- A JWT token is generated and returned upon successful registration
- The token can be used for authenticated requests by including it in the Authorization header

## User Login Endpoint

### POST /user/login

Authenticate a user and return a JWT token.

#### Request Body

```json
{
  "email": "string",
  "password": "string"
}
```

#### Validation Rules
- Email must be a valid email address
- Password must be at least 6 characters long

#### Response

**Success Response (200 OK)**
```json
{
  "token": "string",
  "user": {
    "firstname": "string",
    "lastname": "string",
    "email": "string"
  }
}
```

**Error Responses**

**Invalid Credentials (401 Unauthorized)**
```json
{
  "message": "Invalid email or password"
}
```

**User Not Found (401 Unauthorized)**
```json
{
  "message": "Invalid Email go the registration"
}
```

**Validation Error (400 Bad Request)**
```json
{
  "errors": [
    {
      "msg": "string",
      "param": "string",
      "location": "string"
    }
  ]
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

#### Notes
- The endpoint validates the email and password against the stored credentials
- Upon successful authentication, a new JWT token is generated
- The token can be used for authenticated requests by including it in the Authorization header
- The password is compared with the hashed version stored in the database

## User Profile Endpoint

### GET /user/profile

Get the profile information of the currently authenticated user.

#### Authentication
- Requires a valid JWT token
- Token should be included in the Authorization header or cookies

#### Response

**Success Response (200 OK)**
```json
{
  "firstname": "string",
  "lastname": "string",
  "email": "string",
  "_id": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Error Response (401 Unauthorized)**
```json
{
  "message": "Authentication required"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/user/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Notes
- This endpoint requires authentication
- Returns the complete user profile information
- Password field is excluded from the response for security

## User Logout Endpoint

### GET /user/logout

Log out the currently authenticated user and invalidate their token.

#### Authentication
- Requires a valid JWT token
- Token should be included in the Authorization header or cookies

#### Response

**Success Response (200 OK)**
```json
{
  "message": "Logged out"
}
```

**Error Response (401 Unauthorized)**
```json
{
  "message": "Authentication required"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/user/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Notes
- This endpoint requires authentication
- Invalidates the current token by adding it to a blacklist
- Clears the authentication cookie
- After logout, the token cannot be used for subsequent requests 

## Captain Registration Endpoint

### POST /captain/register

Register a new captain (driver) in the system.

#### Request Body

```json
{
  "fullname": {
    "firstname": "string",
    "lastname": "string"
  },
  "email": "string",
  "password": "string",
  "vehicle": {
    "color": "string",
    "plate": "string",
    "capacity": "number",
    "vehicleType": "string"
  }
}
```

#### Validation Rules
- Email must be a valid email address
- Firstname must be at least 3 characters long
- Password must be at least 6 characters long
- Vehicle color must be at least 3 characters long
- Vehicle plate must be at least 3 characters long
- Vehicle capacity must be at least 1
- Vehicle type must be one of: 'car', 'motorcycle', 'auto'

#### Response

**Success Response (201 Created)**
```json
{
  "token": "string",
  "captain": {
    "firstname": "string",
    "lastname": "string",
    "email": "string",
    "password": "string (hashed)",
    "color": "string",
    "plate": "string",
    "capacity": "number",
    "vehicleType": "string",
    "_id": "string",
    "createdAt": "string",
    "updatedAt": "string"
  }
}
```

**Error Responses**

**Captain Already Exists (400 Bad Request)**
```json
{
  "message": "Captain Already Exists"
}
```

**Validation Error (401 Unauthorized)**
```json
{
  "errors": [
    {
      "msg": "string",
      "param": "string",
      "location": "string"
    }
  ]
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/captain/register \
  -H "Content-Type: application/json" \
  -d '{
    "fullname": {
      "firstname": "John",
      "lastname": "Doe"
    },
    "email": "john.doe@example.com",
    "password": "password123",
    "vehicle": {
      "color": "Black",
      "plate": "ABC123",
      "capacity": 4,
      "vehicleType": "car"
    }
  }'
```

#### Notes
- The password is automatically hashed before being stored in the database
- A JWT token is generated and returned upon successful registration
- The token can be used for authenticated requests by including it in the Authorization header
- Email must be unique in the system
- Vehicle type must be one of the predefined types: car, motorcycle, or auto 

## Captain Login Endpoint

### POST /captain/login

Authenticate a captain and return a JWT token.

#### Request Body

```json
{
  "email": "string",
  "password": "string"
}
```

#### Validation Rules
- Email must be a valid email address
- Password must be at least 6 characters long

#### Response

**Success Response (200 OK)**
```json
{
  "token": "string",
  "captain": {
    "firstname": "string",
    "lastname": "string",
    "email": "string",
    "color": "string",
    "plate": "string",
    "capacity": "number",
    "vehicleType": "string"
  }
}
```

**Error Responses**

**Invalid Credentials (401 Unauthorized)**
```json
{
  "message": "Invalid email or password"
}
```

**Validation Error (400 Bad Request)**
```json
{
  "errors": [
    {
      "msg": "string",
      "param": "string",
      "location": "string"
    }
  ]
}
```

#### Example Request
```bash
curl -X POST http://localhost:3000/captain/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@example.com",
    "password": "password123"
  }'
```

#### Notes
- The endpoint validates the email and password against the stored credentials
- Upon successful authentication, a new JWT token is generated
- The token is also set as a cookie
- The token can be used for authenticated requests by including it in the Authorization header
- The password is compared with the hashed version stored in the database

## Captain Profile Endpoint

### GET /captain/profile

Get the profile information of the currently authenticated captain.

#### Authentication
- Requires a valid JWT token
- Token should be included in the Authorization header or cookies

#### Response

**Success Response (200 OK)**
```json
{
  "firstname": "string",
  "lastname": "string",
  "email": "string",
  "color": "string",
  "plate": "string",
  "capacity": "number",
  "vehicleType": "string",
  "_id": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

**Error Response (401 Unauthorized)**
```json
{
  "message": "Authentication required"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/captain/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Notes
- This endpoint requires authentication
- Returns the complete captain profile information including vehicle details
- Password field is excluded from the response for security

## Captain Logout Endpoint

### GET /captain/logout

Log out the currently authenticated captain and invalidate their token.

#### Authentication
- Requires a valid JWT token
- Token should be included in the Authorization header or cookies

#### Response

**Success Response (200 OK)**
```json
{
  "message": "Logout successfully"
}
```

**Error Response (401 Unauthorized)**
```json
{
  "message": "Authentication required"
}
```

#### Example Request
```bash
curl -X GET http://localhost:3000/captain/logout \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### Notes
- This endpoint requires authentication
- Invalidates the current token by adding it to a blacklist
- Clears the authentication cookie
- After logout, the token cannot be used for subsequent requests 
