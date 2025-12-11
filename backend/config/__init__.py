import pymysql

pymysql.install_as_MySQLdb()

# Django의 mysqlclient 버전 체크 우회
pymysql.version_info = (2, 2, 1, "final", 0)
