from flask import Flask, render_template
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello World!'

@app.route('/user/')
@app.route('/user/<username>')
def show_user(username=None):
    #return 'User: %s' % username
    return render_template('user.html', name=username)

if __name__ == '__main__':
    app.run(debug=True)