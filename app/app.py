from flask import Flask, render_template, request, redirect, url_for
import pandas as pd
import plotly.express as px
import plotly
import json
import os

app = Flask(__name__)
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    file = request.files.get('file')
    if not file or not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        return render_template('index.html', error='Please upload a valid Excel or CSV file.')

    filepath = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(filepath)

    if file.filename.endswith('.csv'):
        df = pd.read_csv(filepath, na_values=['', ' '])
    else:
        df = pd.read_excel(filepath, na_values=['', ' '])

    # Drop completely empty rows
    df = df.dropna(how='all')

    rows, cols = df.shape
    columns = df.columns.tolist()
    preview = df.head(5).to_html(classes='preview-table', index=False)
    numeric_cols = df.select_dtypes(include='number').columns.tolist()
    charts = []

    if len(numeric_cols) >= 1:
        fig1 = px.bar(df.head(20), y=numeric_cols[0],
                      title=f'{numeric_cols[0]} — Bar Chart',
                      template='plotly_white',
                      color_discrete_sequence=['#6C63FF'])
        charts.append(json.dumps(fig1, cls=plotly.utils.PlotlyJSONEncoder))

    if len(numeric_cols) >= 2:
        fig2 = px.scatter(df.head(50), x=numeric_cols[0], y=numeric_cols[1],
                          title=f'{numeric_cols[0]} vs {numeric_cols[1]}',
                          template='plotly_white',
                          color_discrete_sequence=['#FF6584'])
        charts.append(json.dumps(fig2, cls=plotly.utils.PlotlyJSONEncoder))

    if len(numeric_cols) >= 1:
        fig3 = px.line(df.head(30), y=numeric_cols[0],
                       title=f'{numeric_cols[0]} — Trend Line',
                       template='plotly_white',
                       color_discrete_sequence=['#43C59E'])
        charts.append(json.dumps(fig3, cls=plotly.utils.PlotlyJSONEncoder))

    non_numeric = df.select_dtypes(exclude='number').columns.tolist()
    if non_numeric and len(numeric_cols) >= 1:
        pie_data = df.groupby(non_numeric[0])[numeric_cols[0]].sum().reset_index().head(8)
        fig4 = px.pie(pie_data, names=non_numeric[0], values=numeric_cols[0],
                      title=f'{numeric_cols[0]} by {non_numeric[0]}',
                      template='plotly_white')
        charts.append(json.dumps(fig4, cls=plotly.utils.PlotlyJSONEncoder))

    return render_template('dashboard.html',
                           filename=file.filename,
                           rows=rows, cols=cols,
                           columns=columns,
                           preview=preview,
                           charts=charts)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
