dates = """//1
create('0337', '1100')
//2
create('0548', '1049')
//3
create('0452', '1121')
//4
create('0320', '1345')
//5
create('0339', '1200')
//6
create('0540', '1340')
//7
create('0701', '1303')
//8
create('0521', '0759')
//9
create('0649', '1430')
//9-2
create('2252', '0322')
//10
create('0520', '0825')
//11
create('0718', '1339')
//12
create('0007', '0426')
//13
create('0608', '1459')
//14
create('0513', '0807')
//15
create('0100', '0350')
//16
create('0018', '0512')
//17
create('2336', '0312')
//17-2
create('0613', '1052')
//18
create('2311', '0717')
//19
create('2232', '0456')
//20
create('2341', '0418')
//21
create('0442', '0800')
//22
create('2259', '0450')
//23
create('2339', '0526')
//24
create('0000', '0452')
//25
create('2240', '0424')
//26
create('2339', '0500')
//27
create('2327', '0429')
//28
create('0517', '0808')
//29
create('1953', '0024')
//29-2
create('0233', '0503')
//30
create('2038', '0012')
//30-2
create('0302', '0820')
//31
create('2325', '0416')"""

dates = dates.split('\n')

for i in range(int(len(dates) / 2)):
    j = 2 * i
    date = dates[j]
    date = date.removeprefix('//')
    date = date.replace('-', ' - ')
    date = f'12022 / 01 / {date}'
    # print(date)
    create = dates[j + 1]
    create = create.split(')')[0]
    create += f", '{date}')"
    print(create)