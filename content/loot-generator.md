---
player-roll: 
loot-generator-deflation-rating: 100
loot-generator-gem-division-rating: 25
loot_generator_final_loot:
  - (Обычный)  Синяя шпинель (прозрачная, синяя) (500 зм)
  - "**Чистый**  Коралл (непрозрачный, тёмно-красный) (500 зм)"
---




`dice: 1d20`



`INPUT[number:memory^challengeRating]`


```meta-bind-button

style: primary
label: Generate loot
action:
  type: js
  file: javascript/getCoinValue.js
```

`VIEW[Portion of gem value: {memory^gemPortion}%][text]`
`VIEW[coinValue: {memory^totalTreasureCopperValue}][text]`


``` dataviewjs
const page = dv.current()
const finalLoot = page.loot_generator_final_loot

dv.list(finalLoot)

```

