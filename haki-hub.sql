CREATE DATABASE haki_hub_db;
USE haki_hub_db;

CREATE TABLE users(
  user_id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE lawyers (
   id INT AUTO_INCREMENT PRIMARY KEY,
   name VARCHAR(100) NOT NULL,
   description TEXT,
   specialization VARCHAR(255),
   location VARCHAR(100),
   email VARCHAR(100) UNIQUE,
   phone_number VARCHAR(20),
   license_number VARCHAR(50),
   image VARCHAR(255),
   availability ENUM('available', 'unavailable') DEFAULT 'available',
   created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
   updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE legal_resources (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  link_to_resource VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE consultations (
     id INT AUTO_INCREMENT PRIMARY KEY,
     user_id INT,
     lawyer_id INT,
     date DATE,
     time TIME,
     status ENUM('pending', 'confirmed', 'completed', 'canceled') DEFAULT 'pending',
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(user_id),
     FOREIGN KEY (lawyer_id) REFERENCES lawyers(id)
);

CREATE TABLE law_firms (
     id INT AUTO_INCREMENT PRIMARY KEY,
     name VARCHAR(100) NOT NULL,
     address VARCHAR(255),
     contact_info VARCHAR(100),
     website VARCHAR(255),
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE legal_cases (
     id INT AUTO_INCREMENT PRIMARY KEY,
     title VARCHAR(255) NOT NULL,
     summary TEXT,
     full_text TEXT,
     court VARCHAR(100),
     date DATE,
     user_id INT,
     lawyer_id INT,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     FOREIGN KEY (user_id) REFERENCES users(user_id),
     FOREIGN KEY (lawyer_id) REFERENCES lawyers(id)
);