#!/usr/bin/env python3
"""
Complete SaaS KPI Analysis from Stripe Data
Based on ALL subscription and product data from MCP tools
"""

import json
from datetime import datetime
from collections import defaultdict

print("="*130)
print("COMPLETE SAAS KPI ANALYSIS - TOWPILOT vs OTHER SEGMENTS")
print("="*130)

# ALL subscriptions from list_subscriptions call (43 total)
all_subscriptions = [
    {"id":"sub_1SSOptCyexzwFObxEomK37Wf","customer":"cus_TPDGtZT7czUKDo","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SSKkfCyexzwFObxadz9XuAX","customer":"cus_Sqi0YxxOyJohzF","status":"active","price_id":"price_1SQifFCyexzwFObxEjRmdhUU"},
    {"id":"sub_1SSKPyCyexzwFObxFFnrw5GD","customer":"cus_TJtouw9w4is11I","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SSKO4CyexzwFObxC6pwOIzt","customer":"cus_TNKLep72SlVlPL","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SSKMbCyexzwFObxzQo3hvQ6","customer":"cus_TP8bPxVynNoeoR","status":"active","price_id":"price_1SSKL5CyexzwFObxuJjbhDmn"},
    {"id":"sub_1SSKG7CyexzwFObxhHVrYfEq","customer":"cus_TMuCmzE58xk8Ci","status":"active","price_id":"price_1SIKGHCyexzwFObxYlUh4Rmb"},
    {"id":"sub_1SS3GXCyexzwFObxb78NlxCc","customer":"cus_TNGvZ1faDiJ1oN","status":"active","price_id":"price_1SIKGHCyexzwFObxYlUh4Rmb"},
    {"id":"sub_1SRz94CyexzwFObxPk9zB3JE","customer":"cus_TOmcnhVtUR9GDw","status":"active","price_id":"price_1SRz7ICyexzwFObxuPbvSqEI"},
    {"id":"sub_1SQsMVCyexzwFObxJjUZKYQR","customer":"cus_TMX1T2Uw7g4Ytb","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SQWb2CyexzwFObxURBWmgkm","customer":"cus_TGzQ7sirC7TlxU","status":"active","price_id":"price_1SO0JsCyexzwFObx4kj4kYEN"},
    {"id":"sub_1SQEt3CyexzwFObxkMr1wxFV","customer":"cus_TMyqPxtFZOxDeP","status":"active","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SQBm4CyexzwFObxjvoGkqwN","customer":"cus_TJZSEnpOBvASTt","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SQ9icCyexzwFObxgiRymXEt","customer":"cus_TJshKOSvPptW9g","status":"active","price_id":"price_1SO0JsCyexzwFObx4kj4kYEN"},
    {"id":"sub_1SPoaFCyexzwFObxpXlZrcak","customer":"cus_TMXcntBEhHJfg6","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SPn2sCyexzwFObxK5NpiKr3","customer":"cus_TJabm2HUPKsgOd","status":"active","price_id":"price_1SNxDqCyexzwFObx7uJNqM1N"},
    {"id":"sub_1SPn12CyexzwFObxw3oAViGV","customer":"cus_TL2A2ZN5ww0mAU","status":"active","price_id":"price_1SO0JsCyexzwFObx4kj4kYEN"},
    {"id":"sub_1SPQjeCyexzwFObxEOEva233","customer":"cus_TM8zvqFy3SnAck","status":"active","price_id":"price_1SO0JsCyexzwFObx4kj4kYEN"},
    {"id":"sub_1SO0M6CyexzwFObxzkwDvfYv","customer":"cus_TKe4KyUdNWLhlc","status":"active","price_id":"price_1SO0JsCyexzwFObx4kj4kYEN"},
    {"id":"sub_1SO0ErCyexzwFObxTg0TpgAz","customer":"cus_TIPc83UyrlTkxW","status":"active","price_id":"price_1SO0CZCyexzwFObxnisjHmVY"},
    {"id":"sub_1SNyxGCyexzwFObx533r4y5Y","customer":"cus_THg0tIqq8PITej","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SNyD8CyexzwFObxjiYtKYO9","customer":"cus_TKJL50shqwFspE","status":"active","price_id":"price_1SL4rXCyexzwFObxAvwean1Z"},
    {"id":"sub_1SNxG0CyexzwFObxvBXVK2FT","customer":"cus_TKIKfd7NBY1M2U","status":"active","price_id":"price_1SNxDqCyexzwFObx7uJNqM1N"},
    {"id":"sub_1SNm6sCyexzwFObxfKkrYPir","customer":"cus_TKQyPdWUgu4yGt","status":"active","price_id":"price_1RMBl0CyexzwFObxVfkDppky"},
    {"id":"sub_1SNj2aCyexzwFObx2VXiSxxT","customer":"cus_THHmI0ZexNBfWn","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SNc63CyexzwFObxOBhqYDgd","customer":"cus_TJveUGppbgAGhI","status":"active","price_id":"price_1SNc4SCyexzwFObxypfWmH20"},
    {"id":"sub_1SNbviCyexzwFObxkmz1QLxe","customer":"cus_TIMolX0yvMEkol","status":"active","price_id":"price_1SL4rXCyexzwFObxAvwean1Z"},
    {"id":"sub_1SNJ8MCyexzwFObxL2B483wR","customer":"cus_TJx2QRbYKPX440","status":"active","price_id":"price_1RycXLCyexzwFObxjPgji6kA"},
    {"id":"sub_1SNElWCyexzwFObxi7z5DeTz","customer":"cus_TISkZ3B3vI3kBM","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SMte6CyexzwFObxG0hCrx87","customer":"cus_TJWVFTzpDzOvOy","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SLQQiCyexzwFObxcMFHaDYe","customer":"cus_TGsNmIIKnoqgf6","status":"active","price_id":"price_1SIKGHCyexzwFObxYlUh4Rmb"},
    {"id":"sub_1SL5X7CyexzwFObx6iM6kaR9","customer":"cus_SjBcA7i9GVBm58","status":"active","price_id":"price_1SFfHICyexzwFObxDa6YeVWc"},
    {"id":"sub_1SL4uvCyexzwFObxysabTKMz","customer":"cus_TFo95bYi5No1x9","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SL4sbCyexzwFObxyEFJOa8R","customer":"cus_TFQAFdglHgKsG4","status":"active","price_id":"price_1SL4rXCyexzwFObxAvwean1Z"},
    {"id":"sub_1SL4mjCyexzwFObxMogIdcVM","customer":"cus_TF34CtP8MViy0p","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SKim6CyexzwFObxHNGJTQjo","customer":"cus_TFPrPsNz4V64IC","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SKi8uCyexzwFObxkK4XhyYe","customer":"cus_TFNtNjuKsHAhez","status":"active","price_id":"price_1SFfHICyexzwFObxDa6YeVWc"},
    {"id":"sub_1SKPWbCyexzwFObxAs9GDXBX","customer":"cus_TF25sjwljOVqyq","status":"active","price_id":"price_1QiOVcCyexzwFObxMhhCht2y"},
    {"id":"sub_1SKPSLCyexzwFObxW8bZUb3V","customer":"cus_TF25sjwljOVqyq","status":"canceled","price_id":"price_1PaKcACyexzwFObxacEtGxyd"},
    {"id":"sub_1SKN28CyexzwFObxUsvL9rpk","customer":"cus_TFQsKCC92UmiTM","status":"active","price_id":"price_1SKMzCCyexzwFObxv65F5GUv"},
    {"id":"sub_1SKMKNCyexzwFObxilWSuPQl","customer":"cus_TEmepjm6ExXO53","status":"active","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SJpfJCyexzwFObx6vDaqIsZ","customer":"cus_SWjhiZKkDY0Sg4","status":"active","price_id":"price_1RXpYHCyexzwFObxR72kDEbj"},
    {"id":"sub_1SJIVlCyexzwFObx3uQ51k90","customer":"cus_T9PhHKn74bP6Ct","status":"active","price_id":"price_1SIKKjCyexzwFObxDqU8XJ4j"},
    {"id":"sub_1SItylCyexzwFObx4QYs958Q","customer":"cus_TEyCjYp0wUcIXU","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SIXz7CyexzwFObxpVhugucV","customer":"cus_STUqLnlFVWHxo5","status":"active","price_id":"price_1SIXyBCyexzwFObx39iy4rmu"},
    {"id":"sub_1SIXljCyexzwFObx4geWsyQs","customer":"cus_TF1klrciJ9hSsr","status":"active","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SIXjRCyexzwFObxld3vEH8c","customer":"cus_TF1klrciJ9hSsr","status":"canceled","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SIWhUCyexzwFObx7GPzD4KX","customer":"cus_TF0iIwVtpyqSTU","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SIGj7CyexzwFObxBexRRt4y","customer":"cus_SEIWaB5cDK5fwl","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SIEVaCyexzwFObxWA2adJsi","customer":"cus_QJLZVg1e4yPqHV","status":"active","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1SID3DCyexzwFObxvtjA7CqS","customer":"cus_QJLZVg1e4yPqHV","status":"incomplete_expired","price_id":"price_1QiOVsCyexzwFObxjprXMr8R"},
    {"id":"sub_1SIC3ICyexzwFObxNO7NdnMP","customer":"cus_TEfOCs09h0RRxv","status":"canceled","price_id":"price_1SIC2XCyexzwFObxs84oaDTF"},
    {"id":"sub_1SGvaQCyexzwFObxhzmFRGZ5","customer":"cus_TDMIyCHEOUUSxz","status":"active","price_id":"price_1Rku8dCyexzwFObxukCQIVS8"},
    {"id":"sub_1SGn91CyexzwFObxKd3jkqUI","customer":"cus_TDDanczFO6tyqI","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1SGfz4CyexzwFObxHCaCedch","customer":"cus_TD6Bbfry3q9Jfn","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1SGOkwCyexzwFObxJNleLgPF","customer":"cus_TCoNRtsoq1GUz8","status":"active","price_id":"price_1Rku9CCyexzwFObxJEaeIKxN"},
    {"id":"sub_1SG4M2CyexzwFObxkECYrwS5","customer":"cus_TCTITv5ospzY9K","status":"canceled","price_id":"price_1Rku9CCyexzwFObxJEaeIKxN"},
    {"id":"sub_1SG1gsCyexzwFObxPv8JwYrF","customer":"cus_TCQXY6jRFwFRUX","status":"canceled","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SG1ILCyexzwFObxfWRax1Oi","customer":"cus_TCQ896QX9Gt6nL","status":"canceled","price_id":"price_1SG1E1CyexzwFObxQxcCPPh1"},
    {"id":"sub_1SDsMSCyexzwFObxpXMcimgo","customer":"cus_TAClqzFtwynzE5","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1SDSW2CyexzwFObx1PH974jg","customer":"cus_T9m4y4GVz0AX7m","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1SD97xCyexzwFObxNYHU5DEv","customer":"cus_T9S18sjFpgOSrz","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1SD6rxCyexzwFObxLmtpToF4","customer":"cus_T9PhHKn74bP6Ct","status":"canceled","price_id":"price_1Rku9CCyexzwFObxJEaeIKxN"},
    {"id":"sub_1SCiYrCyexzwFObxopM09fFz","customer":"cus_T1hOowKneaOH4I","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1SBKXNCyexzwFObxJP09Nw2U","customer":"cus_SuPaL8jAsrUjNp","status":"past_due","price_id":"price_1RyaR2CyexzwFObxpf5JSYVQ"},
    {"id":"sub_1SAyiCCyexzwFObxRMtreKjv","customer":"cus_T7D8BYaJJuJ3Lf","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S9AEwCyexzwFObxKoj0VKMU","customer":"cus_T5Ku7qtCdpOOor","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1S98PFCyexzwFObxfsD6zkfK","customer":"cus_Ql2xzT7QbuVXmv","status":"active","price_id":"price_1S97fOCyexzwFObxdyTnBc5c"},
    {"id":"sub_1S8RPYCyexzwFObx15fp2VAw","customer":"cus_T4aaDBY5eFENTp","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S8PZZCyexzwFObx7IR7UeFL","customer":"cus_T4YgAiR5trjLna","status":"active","price_id":"price_1Rku8dCyexzwFObxukCQIVS8"},
    {"id":"sub_1S81iXCyexzwFObx6pcgWYxL","customer":"cus_T4A2VsvEW3tTAt","status":"active","price_id":"price_1RkuW6CyexzwFObxTkNdkKLN"},
    {"id":"sub_1S7zi6CyexzwFObx9dNsStht","customer":"cus_T47xWr8kPvUyGa","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S6cTFCyexzwFObxYvmrw4Ax","customer":"cus_T2hs1EXap55bcr","status":"active","price_id":"price_1RycXLCyexzwFObxjPgji6kA"},
    {"id":"sub_1S6IC8CyexzwFObxvRiUD3ut","customer":"cus_T2MvgjaKqvnmHl","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1S6HM0CyexzwFObx6jshN7QF","customer":"cus_T2M3PxoY0vN1JG","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S5ppwCyexzwFObxLTB1LW3U","customer":"cus_T1tdB4IicAo8qc","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S5ZxrCyexzwFObxq6Yo50SM","customer":"cus_T1dEcZfOfBfV31","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S5Sm8CyexzwFObxtRZ3VrBL","customer":"cus_T1VnEmXWMQu7J8","status":"active","price_id":"price_1S5SkFCyexzwFObx2F4A23A6"},
    {"id":"sub_1S59ufCyexzwFObxNqvGrxmg","customer":"cus_T1CJ7lkg973TWP","status":"active","price_id":"price_1RkuW6CyexzwFObxTkNdkKLN"},
    {"id":"sub_1S3NbgCyexzwFObxGADZvnVg","customer":"cus_SzMKShYCiqTCje","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1S3IdMCyexzwFObxgTodoTuU","customer":"cus_SzHBvLVLEHt6IV","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S1cJ6CyexzwFObxm4AQzLVV","customer":"cus_SxXNolQEB02XKp","status":"canceled","price_id":"price_1RkuV4CyexzwFObx9dKXySoD"},
    {"id":"sub_1S0Wv0CyexzwFObx6DaCx3ql","customer":"cus_SwPkvUPo1Sc0e1","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1S0QrQCyexzwFObxhrnrs0Tk","customer":"cus_SwJUd40hWqNhDC","status":"canceled","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1Rz1PDCyexzwFObx8KQb1UvO","customer":"cus_Sur5RQrqpoTjzf","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1RycZeCyexzwFObxfGemvDQ8","customer":"cus_SuRSh3uLjm5NXu","status":"active","price_id":"price_1RycXLCyexzwFObxjPgji6kA"},
    {"id":"sub_1RyalqCyexzwFObxDhLNWdMz","customer":"cus_SuPaL8jAsrUjNp","status":"canceled","price_id":"price_1RyaR2CyexzwFObxpf5JSYVQ"},
    {"id":"sub_1RyaPnCyexzwFObxyWuchgrl","customer":"cus_Su7fxyzi42T1i5","status":"active","price_id":"price_1RXpiZCyexzwFObxfIhAdHU3"},
    {"id":"sub_1RyMuACyexzwFObxnPkoI6QD","customer":"cus_SsBPCURUZIntlU","status":"past_due","price_id":"price_1QiOVcCyexzwFObxMhhCht2y"},
    {"id":"sub_1RyM8RCyexzwFObxRKldDuFl","customer":"cus_Ril1cE0hz8fRze","status":"canceled","price_id":"price_1QiOVcCyexzwFObxMhhCht2y"},
    {"id":"sub_1RyKPhCyexzwFObxJxgfvr4W","customer":"cus_Su8hB1yZ95Zasv","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1RxueuCyexzwFObxDrZ6yW26","customer":"cus_Sti5Tr9QIxCZrP","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1RxaZTCyexzwFObxjYx3VJrd","customer":"cus_StNKvRhhEQppWs","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1RwVZTCyexzwFObxMuk8fmAN","customer":"cus_SsG5gQwXcY7Plz","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1RwTB0CyexzwFObx207AsX5B","customer":"cus_SsDcwxJkZxRgEw","status":"active","price_id":"price_1QpJOSCyexzwFObxYah4pJou"},
    {"id":"sub_1RwR2JCyexzwFObxvUBqjLRb","customer":"cus_SsBPCURUZIntlU","status":"canceled","price_id":"price_1PaKcACyexzwFObxacEtGxyd"},
    {"id":"sub_1Rvma9CyexzwFObxxGKlFDlS","customer":"cus_SrVbAmfotrQyVW","status":"active","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1RvPNsCyexzwFObxeAhW6PoA","customer":"cus_Sr7dvKkxLrFBZc","status":"active","price_id":"price_1Rku8dCyexzwFObxukCQIVS8"},
    {"id":"sub_1Rv0agCyexzwFObxo9kYN12m","customer":"cus_Sqi0YxxOyJohzF","status":"canceled","price_id":"price_1RXpgKCyexzwFObxxTGR6Pmx"},
    {"id":"sub_1Ruxu0CyexzwFObxtKdynd2h","customer":"cus_SqfEXT5YVS70VQ","status":"canceled","price_id":"price_1PLp1XCyexzwFObxkRFlxkM8"},
    {"id":"sub_1RtYayCyexzwFObxHv7fjU99","customer":"cus_SpD0fziF64q0gm","status":"active","price_id":"price_1SQifFCyexzwFObxEjRmdhUU"},
]

# Complete price catalog with products
prices = {
    "price_1SSKL5CyexzwFObxuJjbhDmn": {"amount": 39700, "product": "prod_TP8cwYyzOgQ0ay", "name": "TowPilot Ai Dispatcher", "interval": "month", "interval_count": 1},
    "price_1SRz7ICyexzwFObxuPbvSqEI": {"amount": 19900, "product": "prod_TOmggISVI1QqWg", "name": "TowPilot Ai Dispatch Basic Agent", "interval": "month", "interval_count": 1},
    "price_1SQifFCyexzwFObxEjRmdhUU": {"amount": 49700, "product": "prod_TEnsSPkf6Ui7hE", "name": "TowPilot Ai Dispatcher - Standard Monthly", "interval": "month", "interval_count": 1},
    "price_1SO0JsCyexzwFObx4kj4kYEN": {"amount": 59900, "product": "prod_TKffM2dcQnENSb", "name": "Towpilot Ai Dispatch", "interval": "month", "interval_count": 1},
    "price_1SO0CZCyexzwFObxnisjHmVY": {"amount": 79700, "product": "prod_TKfXPux6V4fvmn", "name": "TowPilot Ai Dispatch Subscription", "interval": "month", "interval_count": 1},
    "price_1SNxDqCyexzwFObx7uJNqM1N": {"amount": 89900, "product": "prod_TKcS0njdSMTCMq", "name": "TowPilot Dispatch Agent Subscription", "interval": "month", "interval_count": 1},
    "price_1SNc4SCyexzwFObxypfWmH20": {"amount": 39900, "product": "prod_TEnsSPkf6Ui7hE", "name": "TowPilot Ai Dispatcher - Standard Monthly", "interval": "month", "interval_count": 1},
    "price_1SL4rXCyexzwFObxAvwean1Z": {"amount": 59900, "product": "prod_TEnsSPkf6Ui7hE", "name": "TowPilot Ai Dispatcher - Standard Monthly", "interval": "month", "interval_count": 1},
    "price_1SKMzCCyexzwFObxv65F5GUv": {"amount": 49900, "product": "prod_TEnsSPkf6Ui7hE", "name": "TowPilot Ai Dispatcher - Standard Monthly", "interval": "month", "interval_count": 1},
    "price_1SIXyBCyexzwFObx39iy4rmu": {"amount": 11500, "product": "prod_SSlCOA9MC9XB7J", "name": "TowPilot Ai Dispatcher - Medium Duty", "interval": "week", "interval_count": 1},
    "price_1SIKKjCyexzwFObxDqU8XJ4j": {"amount": 239100, "product": "prod_TEnww7uD8t78hI", "name": "TowPilot Ai Dispatcher - Premium Quarterly", "interval": "month", "interval_count": 3},
    "price_1SIKGHCyexzwFObxYlUh4Rmb": {"amount": 69700, "product": "prod_TEnsSPkf6Ui7hE", "name": "TowPilot Ai Dispatcher - Standard Monthly", "interval": "month", "interval_count": 1},
    "price_1SG1E1CyexzwFObxQxcCPPh1": {"amount": 49700, "product": "prod_TCQ4z4tgg8FNWo", "name": "TowPilot Ai Dispatcher - Basic Monthly", "interval": "month", "interval_count": 1},
    "price_1SFfHICyexzwFObxDa6YeVWc": {"amount": 79700, "product": "prod_SSlFCGIQ3jM7pi", "name": "TowPilot Ai Dispatcher - Heavy Duty", "interval": "month", "interval_count": 1},
    "price_1S97fOCyexzwFObxdyTnBc5c": {"amount": 500000, "product": "prod_T5IFwK7S6PrZsw", "name": "Enterprise | Vyde", "interval": "month", "interval_count": 1},
    "price_1S5SkFCyexzwFObx2F4A23A6": {"amount": 119600, "product": "prod_SSlFCGIQ3jM7pi", "name": "TowPilot Ai Dispatcher - Heavy Duty", "interval": "week", "interval_count": 6},
    "price_1RycXLCyexzwFObxjPgji6kA": {"amount": 49700, "product": "prod_SSlCOA9MC9XB7J", "name": "TowPilot Ai Dispatcher - Medium Duty", "interval": "month", "interval_count": 1},
    "price_1RyaR2CyexzwFObxpf5JSYVQ": {"amount": 79700, "product": "prod_SSlFCGIQ3jM7pi", "name": "TowPilot Ai Dispatcher - Heavy Duty", "interval": "month", "interval_count": 1},
    "price_1RXpgKCyexzwFObxxTGR6Pmx": {"amount": 149100, "product": "prod_SSlCOA9MC9XB7J", "name": "TowPilot Ai Dispatcher - Medium Duty", "interval": "month", "interval_count": 3},
    "price_1RXpiZCyexzwFObxfIhAdHU3": {"amount": 239100, "product": "prod_SSlFCGIQ3jM7pi", "name": "TowPilot Ai Dispatcher - Heavy Duty", "interval": "month", "interval_count": 3},
    "price_1RkuW6CyexzwFObxTkNdkKLN": {"amount": 89100, "product": "prod_SSl4ZRinfgmkWx", "name": "TowPilot Ai Dispatcher - Light Duty", "interval": "month", "interval_count": 3},
    "price_1Rku9CCyexzwFObxJEaeIKxN": {"amount": 99700, "product": "prod_SSlFCGIQ3jM7pi", "name": "TowPilot Ai Dispatcher - Heavy Duty", "interval": "month", "interval_count": 1},
    "price_1Rku8dCyexzwFObxukCQIVS8": {"amount": 69700, "product": "prod_SSlCOA9MC9XB7J", "name": "TowPilot Ai Dispatcher - Medium Duty", "interval": "month", "interval_count": 1},
    "price_1RMBl0CyexzwFObxVfkDppky": {"amount": 0, "product": "prod_SGjD7N4g07ZEGy", "name": "sandbox", "interval": "month", "interval_count": 1},
    "price_1PLp1XCyexzwFObxkRFlxkM8": {"amount": 0, "product": "prod_QCDSbbKqd7MIXF", "name": "legacy | $0 | Internal", "interval": "month", "interval_count": 1},
    "price_1QpJOSCyexzwFObxYah4pJou": {"amount": 0, "product": "prod_RikuIjk9iarlSR", "name": "Pay-As-You-Go", "interval": "month", "interval_count": 1},
    "price_1QiOVcCyexzwFObxMhhCht2y": {"amount": 150000, "product": "prod_RbbjIhiZCX4T9N", "name": "Pro", "interval": "month", "interval_count": 1},
    "price_1PaKcACyexzwFObxacEtGxyd": {"amount": 0, "product": "prod_QRD2Ob5epj7IsI", "name": "Free", "interval": "month", "interval_count": 1},
    "price_1SIC2XCyexzwFObxs84oaDTF": {"amount": 100, "product": "prod_SSl4ZRinfgmkWx", "name": "TowPilot Ai Dispatcher - Light Duty", "interval": "month", "interval_count": 1},
    "price_1RXpYHCyexzwFObxR72kDEbj": {"amount": 29700, "product": "prod_SSl4ZRinfgmkWx", "name": "TowPilot Ai Dispatcher - Light Duty", "interval": "month", "interval_count": 1},
    "price_1QiOVsCyexzwFObxjprXMr8R": {"amount": 50000, "product": "prod_RbbjmmeH3QLboR", "name": "Basic", "interval": "month", "interval_count": 1},
    "price_1RkuV4CyexzwFObx9dKXySoD": {"amount": 49700, "product": "prod_SSl4ZRinfgmkWx", "name": "TowPilot Ai Dispatcher - Light Duty", "interval": "month", "interval_count": 1},
}

def is_towpilot(product_name):
    """Check if product is TowPilot"""
    keywords = ['towpilot', 'tow pilot', 'towing']
    return any(kw in product_name.lower() for kw in keywords)

def calculate_mrr(amount, interval='month', interval_count=1):
    """Convert to MRR in cents"""
    if interval == 'week':
        return (amount * 52) / 12
    elif interval == 'month':
        return amount / interval_count
    else:
        return amount / 12

# Process all subscriptions
towpilot_data = {'active_subs': [], 'canceled_subs': [], 'customers': set(), 'mrr': 0}
other_data = {'active_subs': [], 'canceled_subs': [], 'customers': set(), 'mrr': 0}

for sub in all_subscriptions:
    price_id = sub['price_id']
    price_info = prices.get(price_id, {})
    
    if not price_info:
        continue
    
    product_name = price_info.get('name', '')
    amount = price_info.get('amount', 0)
    interval = price_info.get('interval', 'month')
    interval_count = price_info.get('interval_count', 1)
    
    mrr = calculate_mrr(amount, interval, interval_count)
    
    sub_detail = {
        'id': sub['id'],
        'customer': sub['customer'],
        'status': sub['status'],
        'product_name': product_name,
        'amount': amount,
        'mrr': mrr
    }
    
    is_tow = is_towpilot(product_name)
    
    if sub['status'] in ['active', 'past_due']:
        if is_tow:
            towpilot_data['active_subs'].append(sub_detail)
            towpilot_data['customers'].add(sub['customer'])
            towpilot_data['mrr'] += mrr
        else:
            other_data['active_subs'].append(sub_detail)
            other_data['customers'].add(sub['customer'])
            other_data['mrr'] += mrr
    elif sub['status'] in ['canceled', 'incomplete_expired']:
        if is_tow:
            towpilot_data['canceled_subs'].append(sub_detail)
        else:
            other_data['canceled_subs'].append(sub_detail)

# Calculate KPIs
total_customers = len(towpilot_data['customers'] | other_data['customers'])
total_mrr = towpilot_data['mrr'] + other_data['mrr']
total_arr = total_mrr * 12

print("\n📊 CUSTOMER SEGMENTATION SUMMARY")
print("-" * 130)
print(f"{'Segment':<30} {'Active Subs':>12} {'Customers':>12} {'MRR':>15} {'ARR':>15} {'ARPU/Mo':>15} {'% of Total':>12}")
print("-" * 130)

tow_customers = len(towpilot_data['customers'])
other_customers = len(other_data['customers'])

print(f"{'TowPilot':<30} {len(towpilot_data['active_subs']):>12} {tow_customers:>12} ${towpilot_data['mrr']/100:>13,.0f} ${towpilot_data['mrr']*12/100:>13,.0f} ${(towpilot_data['mrr']/100/tow_customers) if tow_customers > 0 else 0:>13,.0f} {(towpilot_data['mrr']/total_mrr*100) if total_mrr > 0 else 0:>11.1f}%")
print(f"{'Other Products':<30} {len(other_data['active_subs']):>12} {other_customers:>12} ${other_data['mrr']/100:>13,.0f} ${other_data['mrr']*12/100:>13,.0f} ${(other_data['mrr']/100/other_customers) if other_customers > 0 else 0:>13,.0f} {(other_data['mrr']/total_mrr*100) if total_mrr > 0 else 0:>11.1f}%")
print("-" * 130)
print(f"{'TOTAL':<30} {len(towpilot_data['active_subs']) + len(other_data['active_subs']):>12} {total_customers:>12} ${total_mrr/100:>13,.0f} ${total_arr/100:>13,.0f} ${(total_mrr/100/total_customers) if total_customers > 0 else 0:>13,.0f} {'100.0%':>12}")
print("=" * 130)

# Churn analysis
tow_total_ever = len(towpilot_data['active_subs']) + len(towpilot_data['canceled_subs'])
tow_churn_rate = (len(towpilot_data['canceled_subs']) / tow_total_ever * 100) if tow_total_ever > 0 else 0

other_total_ever = len(other_data['active_subs']) + len(other_data['canceled_subs'])
other_churn_rate = (len(other_data['canceled_subs']) / other_total_ever * 100) if other_total_ever > 0 else 0

print("\n📉 CHURN ANALYSIS")
print("-" * 130)
print(f"{'Segment':<30} {'Active':>12} {'Canceled':>12} {'Total Ever':>12} {'Churn Rate':>15} {'Retention':>12}")
print("-" * 130)
print(f"{'TowPilot':<30} {len(towpilot_data['active_subs']):>12} {len(towpilot_data['canceled_subs']):>12} {tow_total_ever:>12} {tow_churn_rate:>14.1f}% {(100-tow_churn_rate):>11.1f}%")
print(f"{'Other Products':<30} {len(other_data['active_subs']):>12} {len(other_data['canceled_subs']):>12} {other_total_ever:>12} {other_churn_rate:>14.1f}% {(100-other_churn_rate):>11.1f}%")
print(f"-" * 130)
total_active = len(towpilot_data['active_subs']) + len(other_data['active_subs'])
total_canceled = len(towpilot_data['canceled_subs']) + len(other_data['canceled_subs'])
total_ever = total_active + total_canceled
total_churn = (total_canceled / total_ever * 100) if total_ever > 0 else 0
print(f"{'OVERALL':<30} {total_active:>12} {total_canceled:>12} {total_ever:>12} {total_churn:>14.1f}% {(100-total_churn):>11.1f}%")
print("=" * 130)

# Pricing tier breakdown for TowPilot
print("\n💰 TOWPILOT PRICING TIER DISTRIBUTION")
print("-" * 130)
tier_stats = defaultdict(lambda: {'count': 0, 'mrr': 0, 'customers': set()})

for sub in towpilot_data['active_subs']:
    tier = sub['product_name']
    tier_stats[tier]['count'] += 1
    tier_stats[tier]['mrr'] += sub['mrr']
    tier_stats[tier]['customers'].add(sub['customer'])

print(f"{'Tier':<60} {'Customers':>12} {'MRR':>15} {'ARPU':>12} {'% of Tow':>12}")
print("-" * 130)

for tier, stats in sorted(tier_stats.items(), key=lambda x: x[1]['mrr'], reverse=True):
    tier_customers = len(stats['customers'])
    tier_mrr = stats['mrr'] / 100
    tier_arpu = tier_mrr / tier_customers if tier_customers > 0 else 0
    pct_of_tow = (stats['mrr'] / towpilot_data['mrr'] * 100) if towpilot_data['mrr'] > 0 else 0
    print(f"{tier:<60} {tier_customers:>12} ${tier_mrr:>13,.0f} ${tier_arpu:>10,.0f} {pct_of_tow:>11.1f}%")

print("=" * 130)

# Key SaaS Metrics Summary
print("\n🎯 KEY SAAS METRICS")
print("=" * 130)

print(f"\n1. REVENUE METRICS:")
print(f"   • Total MRR:           ${total_mrr/100:>12,.0f}")
print(f"   • Total ARR:           ${total_arr/100:>12,.0f}")
print(f"   • TowPilot % of MRR:   {(towpilot_data['mrr']/total_mrr*100) if total_mrr > 0 else 0:>12.1f}%")
print(f"   • Average Contract Value (ACV): ${total_arr/100/total_customers if total_customers > 0 else 0:>12,.0f}")

print(f"\n2. CUSTOMER METRICS:")
print(f"   • Total Active Customers:      {total_customers:>8}")
print(f"   • TowPilot Customers:          {tow_customers:>8} ({tow_customers/total_customers*100 if total_customers > 0 else 0:.0f}%)")
print(f"   • Other Product Customers:     {other_customers:>8} ({other_customers/total_customers*100 if total_customers > 0 else 0:.0f}%)")
print(f"   • Overall ARPU:                ${total_mrr/100/total_customers if total_customers > 0 else 0:>8,.0f}/month")

print(f"\n3. RETENTION METRICS:")
print(f"   • Overall Retention Rate:      {100 - total_churn:>8.1f}%")
print(f"   • TowPilot Retention:          {100 - tow_churn_rate:>8.1f}%")
print(f"   • Churn Count (All Time):      {total_canceled:>8}")

# Assuming CAC from deck
cac = 831  # From investor deck
ltv_months = 36  # Assume 36 month lifetime
avg_monthly_revenue = total_mrr / 100 / total_customers if total_customers > 0 else 0
ltv = avg_monthly_revenue * ltv_months * 0.558  # Gross margin 55.8%

print(f"\n4. UNIT ECONOMICS:")
print(f"   • CAC (from deck):             ${cac:>8,.0f}")
print(f"   • LTV (36mo @ 55.8% GM):       ${ltv:>8,.0f}")
print(f"   • LTV/CAC Ratio:               {ltv/cac if cac > 0 else 0:>8.1f}x")
print(f"   • CAC Payback (months):        {cac/(avg_monthly_revenue*0.558) if avg_monthly_revenue > 0 else 0:>8.1f}")

print("\n" + "=" * 130)

# Save results to JSON for use in investor deck
results = {
    'timestamp': datetime.now().isoformat(),
    'total': {
        'mrr': total_mrr / 100,
        'arr': total_arr / 100,
        'customers': total_customers,
        'active_subs': total_active,
        'arpu': (total_mrr/100/total_customers) if total_customers > 0 else 0,
        'retention_rate': 100 - total_churn
    },
    'towpilot': {
        'mrr': towpilot_data['mrr'] / 100,
        'arr': towpilot_data['mrr'] * 12 / 100,
        'customers': tow_customers,
        'active_subs': len(towpilot_data['active_subs']),
        'arpu': (towpilot_data['mrr']/100/tow_customers) if tow_customers > 0 else 0,
        'pct_of_total_mrr': (towpilot_data['mrr']/total_mrr*100) if total_mrr > 0 else 0,
        'retention_rate': 100 - tow_churn_rate
    },
    'other': {
        'mrr': other_data['mrr'] / 100,
        'arr': other_data['mrr'] * 12 / 100,
        'customers': other_customers,
        'active_subs': len(other_data['active_subs']),
        'arpu': (other_data['mrr']/100/other_customers) if other_customers > 0 else 0,
        'pct_of_total_mrr': (other_data['mrr']/total_mrr*100) if total_mrr > 0 else 0,
        'retention_rate': 100 - other_churn_rate
    }
}

with open('saas_kpis.json', 'w') as f:
    json.dump(results, f, indent=2)

print("✅ Results saved to saas_kpis.json")
print("="*130)

