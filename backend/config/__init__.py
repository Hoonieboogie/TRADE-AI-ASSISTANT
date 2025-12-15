import pymysql

# Django 5.x+ 버전 체크를 통과하기 위해 PyMySQL 버전을 mysqlclient 버전으로 위장
pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()
