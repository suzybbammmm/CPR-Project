def mask_name(name: str) -> str:
    chars = list(name)
    if len(chars) <= 1:
        return name
    if len(chars) == 2:
        return chars[0] + '*'
    return chars[0] + '*' * (len(chars) - 2) + chars[-1]


def mask_student_number(sn: str) -> str:
    if len(sn) < 4:
        return '*' * len(sn)
    return sn[:4] + '*' * (len(sn) - 4)
