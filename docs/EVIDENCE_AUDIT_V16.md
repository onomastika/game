# Keyboard Choice Lab — выбор по ощущениям и подключению, v1.6

Дата проверки: 2026-11-07. Состояние: 124 модели, **14 адресно дополнены** по первичным техническим страницам. Это не означает, что каждый атрибут всех 124 моделей проверен индивидуально.

## Исправленные решения

1. `key_aftertouch` и `pad_aftertouch` — раздельные поля; `null` = не подтверждено. `present` = наличие подтверждено, тип не конкретизирован. **Не** переносить значения из старого обобщённого поля `aftertouch` автоматически.
2. `power_modes_verified = true` только при проверенном официальном описании способов питания. Старый список `power_modes: []` не означает отсутствие батарей.
3. Строгие фильтры используют трёхзначные проверки: подтверждено / не соответствует / проверить. Так неизвестная масса не считается ни нулём, ни большой.
4. Старые цены не влияют на баллы рекомендаций и не считаются наличием в магазине; для сравнения цены по-прежнему помечены датами.
5. USB audio не гарантирует, что можно записать звук **из устройства в Reaper**: интерфейсы могут иметь разные направления аудиопотока. Отдельный тест подключения обязателен.
6. Тестирование клавиш руками не заменено текстовой классификацией механики. Полувзвешенные, органные и мини-клавиши не ранжируются как объективно «лучше/хуже».

## 14 официальных источников для углубления

| Модель | Производитель — спецификации |
| --- | --- |
| Korg microKEY2 61 | https://www.korg.com/uk/products/computergear/microkey2/page_1.php |
| Korg microSTATION | https://www.korg.com/caen/products/synthesizers/microstation/page_3.php |
| Casio CT-S1 | https://www.casio.com/us/electronic-musical-instruments/brands/casiotone/cts1/ |
| Roland GO:KEYS 3 | https://www.roland.com/global/products/gokeys_3/specifications/ |
| Yamaha PSR-E383 | https://vn.yamaha.com/vi/musical-instruments/keyboards/products/portable-keyboards/psr-e383/specs.html |
| Novation Launchkey 61 MK4 | https://novationmusic.com/products/launchkey-61 |
| Arturia KeyLab Essential 61 mk3 | https://www.arturia.com/store/keylab-essential-61-mk3 |
| Korg Keystage 61 | https://www.korg.com/download/global/html_manual/keystage/us/Topics/6-1_specification.htm |
| Korg KROSS2 61 | https://www.korg.com/hken/products/synthesizers/kross2/specifications.php |
| Yamaha CK61 | https://vn.yamaha.com/vi/musical-instruments/keyboards/products/stagekeyboards/ck/specs.html |
| Roland JUNO-D6 | https://www.roland.com/US/products/juno-d6/ |
| Arturia AstroLab 61 | https://www.arturia.com/products/hardware-synths/astrolab/astrolab-61 |
| M-Audio Keystation 61 MK3 | https://www.m-audio.com/keyboard-controllers/keystation-61-mk3.html |
| Nektar Impact GX61 | https://nektartech.com/products/impact-gx49-61/ |

Конкретные значения и список полей, пересмотренных в v1.6, хранятся в каждой записи `physical_spec_evidence.fields`. В ссылках на `source_refs` прежние факты и даты сохранены.

## Не сделано и честные ограничения

- Не проверены детально новые свойства оставшихся 110 моделей. Это видно на сайте как «не подтверждено», без дописывания недостоверных чисел.
- Нет измеренного хода клавиш, усилия нажатия и объективно сравнимой акустической задержки. Их нельзя получить из маркетинговых названий механики.
- Нет подтверждённых свежих цен и наличия во Вьетнаме; в рекомендациях не обещается готовая покупка.
- Прошли 56 автоматических тестов Node; Chromium отказался открывать даже локальные страницы (`ERR_BLOCKED_BY_ADMINISTRATOR`). Скриншотное и полноценное браузерное тестирование не отмечено как успешное.

## Команды проверки

```sh
cd docs
npm test
npm run build:offline
node --check app.js
node --check engine.js
node --check scripts/build-offline.mjs
```
