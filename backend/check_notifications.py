import sqlite3

def check_notifications():
    # Connect to the SQLite database
    conn = sqlite3.connect('D:\\Demo Project\\random\\backend\\test.db')
    cursor = conn.cursor()

    # Query to fetch all notifications
    cursor.execute("SELECT * FROM notifications")
    notifications = cursor.fetchall()

    # Print notifications
    for notification in notifications:
        print(notification)

    # Close the database connection
    conn.close()

if __name__ == "__main__":
    check_notifications()
