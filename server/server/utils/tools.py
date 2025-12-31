import random
import re


# 生成数字随机码
def generate_random_code(length=6):
    code = ''
    for _ in range(length):
        code += str(random.randint(0, 9))
    return code


def generate_random_code_with_letter(length=6, up=False):
    source = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789'
    code = ''
    for _ in range(length):
        code += random.choice(source)
    if up:
        code = code.upper()
    return code


def generate_batch_test_code(lst: list[str](), length=100):
    while True:
        code = generate_random_code_with_letter(8)
        if code not in lst:
            lst.append(code)
        if len(lst) > 100:
            break
    return lst


# 验证邮箱
def valid_email(email_address):
    regex = '^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$'
    if re.match(regex, email_address):
        return True
    return False
