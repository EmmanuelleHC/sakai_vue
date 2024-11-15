This project was cloned from the Sakai Vue repository and consists of invoice CRUD operations with PDF generation functionality. The backend version can be found in the [web_crud repository](https://github.com/EmmanuelleHC/web_crud)." 

### **Clone the Repository**
1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd <folder-name>
   ```

### **Install Dependencies**
2. Install the required dependencies:
   ```bash
   npm install
   ```

### **Run the Development Server**
3. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend application will run on [http://localhost:5173/](http://localhost:5173/). 

### **Laravel Backend Setup**
4. Ensure the Laravel backend is properly configured:
   - Update the **`.env`** file to include the `FRONTEND_URL`:
     ```
     FRONTEND_URL=http://localhost:5173
     ```
   - Update CORS settings in `config/cors.php` to allow requests from the frontend URL:
     ```php
     'paths' => ['api/*', 'sanctum/csrf-cookie'],
     'allowed_origins' => ['http://localhost:5173'],
     'allowed_methods' => ['*'],
     'allowed_headers' => ['*'],
     'supports_credentials' => true,
     ```
   - Make sure Sanctum's configuration in `sanctum.php` also references the frontend URL for cookie-based authentication:
     ```php
     'stateful' => ['localhost:5173'],
     ```

### **Run the Laravel Server**
5. Start the Laravel backend server:
   ```bash
   php artisan serve
   ```

---

## **Usage**

1. Start both the frontend and backend servers:
   - Frontend: `npm run dev` (default URL: [http://localhost:5173/](http://localhost:5173/))
   - Backend: `php artisan serve` (default URL: [http://localhost:8000/](http://localhost:8000/))

2. If the frontend URL changes, update it in both the Laravel `.env` file (`FRONTEND_URL`) and CORS configuration (`cors.php`).
