# Aegis: Student Academic Monitoring & Early Warning System

Aegis is an intelligent, early warning academic dashboard designed to monitor student performance, predict risk tiers, and generate dynamic AI-driven advisory messages. It utilizes deep learning models (LSTM & 1D CNN) trained on student behavior sequences and integrates a premium web interface for academic advisors and students.

---

## 📊 Dataset: Open University Learning Analytics Dataset (OULAD)

Due to GitHub's file size restrictions, the raw OULAD CSV dataset files are excluded from this repository. 

### 1. Download the Dataset
You can download the official OULAD dataset from either of the following sources:
* **Official Website**: [Open University Learning Analytics Dataset](https://analyse.kmi.open.ac.uk/resources/open_university_learning_analytics_dataset)
* **Kaggle**: [OULAD on Kaggle](https://www.kaggle.com/datasets/anikit/open-university-learning-analytics-dataset)

### 2. Local Directory Setup
After downloading the dataset, extract the contents and place all `.csv` files into a folder named `Dataset` at the root directory of this project:
```text
AGENT/
├── Dataset/
│   ├── studentInfo.csv
│   ├── studentRegistration.csv
│   ├── studentVle.csv
│   ├── studentAssessment.csv
│   ├── assessments.csv
│   ├── courses.csv
│   └── vle.csv
├── saved_model/
└── frontend/
```

---

## 🧠 Model Benchmarking & Architectures

Aegis compares multiple neural network configurations and baseline classifiers evaluated on a held-out OULAD test set:

| Model | ROC AUC | Accuracy | Recall | F1 Score |
| :--- | :---: | :---: | :---: | :---: |
| **LSTM (Proposed Recurrent)** | **98.41%** | **94.22%** | **90.75%** | **93.45%** |
| **CNN (1D Convolutional)** | **97.55%** | **92.33%** | **88.88%** | **91.33%** |
| **Random Forest** | 98.04% | 93.68% | 88.99% | 92.74% |
| **Logistic Regression** | 98.00% | 93.39% | 90.65% | 92.57% |

* **LSTM (Proposed)**: Best overall architecture. Excels at capturing long-term sequential dependencies and shifts in weekly clickstream behavior.
* **CNN (1D Conv)**: Highly efficient model capturing local patterns and spikes in student engagement using sliding window convolutions.

---

## 🛠️ Tech Stack & Features

* **Frontend**: React.js, Chart.js, Tailwind CSS. Includes:
  * **Advisors Portal**: Search, risk metrics cards, engagement charts, model version indicators, and dynamic recommended actions.
  * **Run Agent Panel**: Configurable evaluation runs with evaluation week triggers and classifier model selectors.
  * **Model Comparison View**: Detailed metric tables and comparative metric bar charts.
* **Backend**: Flask (Python 3.11), TensorFlow/Keras, Joblib.
* **Database**: MySQL (for relational tracking of enrollments, weekly clickstream behaviors, model risk history, and interventions).
* **LLM Engine**: OpenAI API / Groq SDK for generating contextual, dual-paragraph student academic support messages.

---

## 🚀 Running the Project Locally

### 1. Database Setup
1. Start your local MySQL instance (e.g., via XAMPP).
2. Create a database named `student_monitoring_db`.
3. Import the database schema and sample records from your SQL script.

### 2. Flask Backend API
1. Navigate to the `saved_model/` folder:
   ```bash
   cd saved_model
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set your API Key in `app.py`:
   ```python
   GROQ_API_KEY = "your-api-key"
   ```
4. Run the Flask application:
   ```bash
   python app.py
   ```
   *(Running locally on `http://127.0.0.1:5000`)*

### 3. React Frontend
1. Navigate to the `frontend/student-dashboard/` folder:
   ```bash
   cd frontend/student-dashboard
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *(Access the dashboard at `http://localhost:5173/admin`)*
