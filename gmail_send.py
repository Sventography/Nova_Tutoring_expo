from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from base64 import urlsafe_b64encode
from email.mime.text import MIMEText
import sys

SCOPES = ['https://www.googleapis.com/auth/gmail.send']

def get_service():
    creds = Credentials.from_authorized_user_file('token.json', SCOPES)
    return build('gmail', 'v1', credentials=creds)

def create_message(to, subject, body):
    msg = MIMEText(body)
    msg['to'] = to
    msg['subject'] = subject
    raw = urlsafe_b64encode(msg.as_bytes()).decode()
    return {'raw': raw}

if __name__ == '__main__':
    to = sys.argv[1]
    subject = sys.argv[2]
    body = ' '.join(sys.argv[3:])
    service = get_service()
    message = create_message(to, subject, body)
    sent = service.users().messages().send(userId='me', body=message).execute()
    print("Message sent! ID:", sent.get('id'))
