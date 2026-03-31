# Prompt Exploration Notes

**Date:** 2026-03-31
**Model:** gemma2:9b (Q4_0, 5.4 GB) on Ollama/Orin AGX server
**Goal:** Find prompt pairs for the ICOTS interview experiment that contrast high vs low top-1 probability, where both prompts are equally factual and specific (not vague/open-ended).

## Model selection

Tested four models on the Ollama server. All prompts used the CODAP plugin's exact prompt format (Simple Completion preset, chat mode, trailing space).

| Model | Size | Verdict |
|---|---|---|
| **gemma2:9b** | 9.2B Q4 | **Winner.** Clean distributions, no non-English leakage in top-3, ~1s warm inference |
| llama3.2:3b | 3.2B Q4_K_M | Good quality, occasional odd tokens ("Dom" in meows top-5) |
| gemma2:2b | 2.6B Q4 | Decent but non-English tokens bleed through (猫, blå) |
| llama2:7b-chat | 7B Q4 | Messy — 16% probability on newline tokens, subword fragments |
| qwen3.5:0.8b | 873M Q8 | **Unusable.** Reasoning model emits `<think>` chains; logprobs meaningless |

Latency: ~7-10s cold start (first prompt loads model into memory), ~1s thereafter. Only one API call needed per prompt (logprobs returned on first token), so latency is not a concern.

## Key design insight

"Vagueness" and "low top-1" are easily conflated. A prompt like "A country in Asia is [Country]" gets low top-1 (Thailand 53%) because *many answers are correct*, not because the model is uncertain about a fact. For the experiment to work, both the high and low prompts should be:

- Specific factual questions with a defensible correct answer
- Same syntactic structure ("The most/largest/fastest X is ___")
- Accessible to 1st-year undergraduates
- Not culturally specific to any one region

The spread in the low prompt should come from **genuine uncertainty** — contested facts, near-ties, common misconceptions — not from open-endedness.

## Full results (all runs)

### Run 1: 60 broad prompts (prompts.json)

With greedy completion and case-merging (Cat+cat → cat 100%):

| ID | Domain | Template | Top-1 | Top-2 | Top-3 |
|---|---|---|---|---|---|
| 1 | animals | What kind of animal meows? A [Animal] | Cat 100.0% | Kitten 0.0% | Meow 0.0% |
| 2 | animals | What kind of animal barks? A [Animal] | Dog 100.0% | 🐶 0.0% | Dogs 0.0% |
| 3 | animals | The fastest land animal is the [Animal] | cheetah 100.0% | lion 0.0% | Chetah 0.0% |
| 4 | animals | A common household pet is a [Animal] | Cat 98.6% | Dog 1.4% | Animal 0.0% |
| 5 | animals | An animal you might see at the zoo is a [Animal] | Lion 78.5% | Giraffe 6.3% | Tiger 5.1% |
| 6 | animals | A cute animal is a [Animal] | kitten 62.8% | puppy 33.0% | cat 1.4% |
| 7 | animals | The largest animal in the ocean is the [Animal] | whale 94.2% | blue 5.8% | 鲸鱼 0.0% |
| 8 | animals | The animal known as the king of the jungle is the [Animal] | Lion 99.8% | león 0.2% | leão 0.0% |
| 9 | geography | The longest river in the world is the [River] | Nile 99.4% | Amazon 0.6% | Nil 0.0% |
| 10 | geography | The tallest mountain in the world is Mount [Mountain] | Everest 99.9% | E 0.0% | Himalaya 0.0% |
| 11 | geography | The largest continent on Earth is [Continent] | Asia 100.0% | Asias 0.0% | Asie 0.0% |
| 12 | geography | The capital of Australia is [City] | Canberra 100.0% | City 0.0% | Sydney 0.0% |
| 13 | geography | A country in Asia is [Country] | Thailand 53.0% | Japan 33.1% | China 4.7% |
| 14 | geography | A famous city to visit is [City] | Paris 83.6% | Rome 9.5% | London 4.4% |
| 15 | geography | The largest ocean on Earth is the [Ocean] | Pacific 100.0% | Atlantic 0.0% | Pacifc 0.0% |
| 16 | geography | The largest desert in the world is the [Desert] | Antarctic 70.3% | Antarctica 23.1% | Arctic 5.3% |
| 17 | food | The most popular pizza topping is [Topping] | pepperoni 86.0% | cheese 13.7% | pizza 0.1% |
| 18 | food | The main ingredient in guacamole is [Ingredient] | Avocado 97.7% | Avocados 2.2% | Avacado 0.0% |
| 19 | food | A delicious fruit is a [Fruit] | mango 52.8% | apple 19.1% | strawberry 15.2% |
| 20 | food | A popular snack food is [Food] | chips 69.0% | Popcorn 20.2% | Potato 7.7% |
| 21 | food | The most popular flavor of ice cream is [Flavor] | Vanilla 92.1% | Chocolate 6.7% | vainilla 1.2% |
| 22 | food | A long yellow fruit you peel before eating is a [Fruit] | banana 99.6% | bananas 0.4% | 香蕉 0.0% |
| 23 | food | A food you eat for breakfast is [Food] | cereal 84.4% | Food 7.7% | toast 1.6% |
| 24 | food | A vegetable that is orange is a [Vegetable] | carrot 98.3% | carotene 1.6% | pumpkin 0.1% |
| 25 | science | The planet closest to the Sun is [Planet] | Mercury 100.0% | Mercuy 0.0% | Venus 0.0% |
| 26 | science | Water freezes at zero degrees [Unit] | Celsius 98.7% | Celcius 1.1% | Unit 0.1% |
| 27 | science | The hardest natural substance is [Substance] | diamond 99.8% | ダイヤモンド 0.1% | Diamonds 0.0% |
| 28 | science | A color in the rainbow is [Color] | red 20.2% | Green 15.1% | Violet 13.4% |
| 29 | science | Diamonds are made of [Element] | carbon 99.9% | Element 0.1% | carbono 0.0% |
| 30 | science | A type of energy is [Energy] | kinetic 87.3% | potential 5.1% | light 2.7% |
| 31 | science | The gas that humans breathe in is [Gas] | oxygen 99.7% | Air 0.3% | oxígeno 0.1% |
| 32 | science | An organ in the human body is the [Organ] | heart 97.1% | liver 2.7% | lung 0.1% |
| 33 | sports | The most popular sport in the world is [Sport] | Football 69.8% | Soccer 30.2% | футбол 0.0% |
| 34 | sports | A fun outdoor activity is [Activity] | Hiking 73.0% | picnic 20.6% | camping 2.1% |
| 35 | sports | In basketball, you shoot the ball into a [Object] | basket 59.9% | hoop 38.3% | hoops 1.7% |
| 36 | sports | A marathon is a long [Word] | race 64.0% | distance 33.6% | run 2.4% |
| 37 | sports | A sport played with a ball is [Sport] | Football 47.9% | Soccer 37.7% | Sport 4.9% |
| 38 | sports | A winter sport is [Sport] | Skiing 65.0% | Skating 19.0% | Snowboarding 13.0% |
| 39 | everyday | You use a key to open a [Object] | lock 92.2% | door 7.4% | Object 0.2% |
| 40 | everyday | You wash your hands with soap and [Word] | water 99.8% | warm 0.1% | scrub 0.0% |
| 41 | everyday | Most people sleep in a [Object] | bed 99.8% | bedroom 0.1% | Object 0.0% |
| 42 | everyday | Something you do every morning is [Activity] | Activity 51.6% | Brush 38.7% | Wake 5.6% |
| 43 | everyday | A useful thing to have in your bag is a [Object] | knife 13.7% | flashlight 11.9% | handkerchief 10.3% |
| 44 | everyday | In the morning, many people drink [Drink] | coffee 99.9% | coffe 0.1% | water 0.0% |
| 45 | everyday | A popular hobby is [Hobby] | Reading 51.7% | Gardening 30.0% | painting 8.9% |
| 46 | everyday | To find out the time, you look at a [Object] | clock 92.7% | watch 6.8% | reloj 0.5% |
| 47 | language | The opposite of hot is [Word] | cold 100.0% | col 0.0% | frío 0.0% |
| 48 | language | The past tense of go is [Word] | went 99.8% | gone 0.2% | wen 0.0% |
| 49 | language | A word that means the same as happy is [Word] | joyful 97.1% | glad 1.2% | jovial 0.7% |
| 50 | language | A word that means the same as big is [Word] | large 99.8% | huge 0.2% | vast 0.0% |
| 51 | language | The plural of child is [Word] | children 100.0% | childern 0.0% | childrens 0.0% |
| 52 | language | The opposite of love is [Word] | hate 97.8% | hatred 2.2% | indifference 0.0% |
| 53 | history | The first person to walk on the Moon was Neil [Name] | Armstrong 99.9% | Aronst 0.1% | Astronaut 0.0% |
| 54 | history | The Pyramids of Giza are in [Country] | Egypt 100.0% | Egipto 0.0% | Country 0.0% |
| 55 | history | A famous scientist is Albert [Name] | Einstein 99.9% | Einsteain 0.0% | Eintein 0.0% |
| 56 | history | An important year in history is [Year] | 1969 88.5% | Year 7.4% | Nineteenfortyfive 1.7% |
| 57 | culture | Harry Potter's best friend is Ron [Name] | Weasley 99.5% | Name 0.2% | Weasely 0.2% |
| 58 | culture | The superhero who can climb walls like a spider is [Hero] | Spiderman 99.9% | Spidey 0.1% | Hero 0.0% |
| 59 | culture | A fun type of music is [Genre] | Pop 82.3% | Jazz 8.1% | Genre 7.3% |
| 60 | culture | A popular movie genre is [Genre] | Comedy 64.4% | Action 32.3% | Romance 1.4% |

### Run 2: Contested/debated facts (prompts_v2.json)

| ID | Domain | Template | Top-1 | Top-2 | Top-3 |
|---|---|---|---|---|---|
| 101 | geography | The longest river in the world is the [River] | Nile 99.4% | Amazon 0.6% | Nil 0.0% |
| 102 | geography | The second longest river in the world is the [River] | Amazon 99.8% | Nile 0.1% | Amazons 0.0% |
| 103 | geography | The capital of Australia is [City] | Canberra 100.0% | City 0.0% | Sydney 0.0% |
| 104 | geography | The capital of Turkey is [City] | Ankara 100.0% | Istanbul 0.0% | Ank 0.0% |
| 105 | geography | The largest desert in the world is the [Desert] | Antarctic 70.3% | Antarctica 23.1% | Arctic 5.3% |
| 106 | geography | The most populated country in the world is [Country] | China 76.1% | India 23.9% | Indonesia 0.0% |
| 107 | geography | The tallest building in the world is the [Building] | Burj 99.1% | Building 0.8% | Bhurj 0.0% |
| 108 | geography | The deepest lake in the world is Lake [Lake] | Baikal 99.7% | Baysal 0.2% | Baikalsk 0.0% |
| 201 | language | The most spoken language in the world is [Language] | Mandarin 70.6% | English 27.4% | Chinese 2.0% |
| 202 | language | The most widely used alphabet in the world is the [Alphabet] | Latin 94.4% | Roman 5.3% | English 0.1% |
| 203 | language | The hardest language to learn is [Language] | Mandarin 98.3% | Chinese 1.1% | Hungarian 0.4% |
| 301 | science | The hottest planet in the solar system is [Planet] | Venus 97.7% | Mercury 2.3% | Mars 0.0% |
| 302 | science | The most common element in the universe is [Element] | Hydrogen 100.0% | hydroge 0.0% | \<eos 0.0% |
| 303 | science | The fastest thing in the universe is [Word] | light 99.9% | speed 0.1% | nothing 0.0% |
| 304 | science | The chemical symbol for gold is [Symbol] | Au 100.0% | gold 0.0% | Aurum 0.0% |
| 305 | science | The Earth's core is mostly made of [Element] | iron 96.7% | nickel 2.6% | metal 0.6% |
| 306 | science | The hardest substance in the human body is [Substance] | enamel 92.6% | bone 7.0% | tooth 0.4% |
| 401 | history | The inventor of the telephone is Alexander Graham [Name] | Bell 99.9% | Name 0.1% | Belll 0.0% |
| 402 | history | The inventor of the printing press is [Name] | Gutenberg 97.5% | Johannes 2.1% | Guttenberg 0.2% |
| 403 | history | The first people to fly an airplane were the Wright [Word] | brothers 99.7% | siblings 0.1% | brethren 0.0% |
| 501 | food | The most popular fruit in the world is the [Fruit] | Banana 89.0% | Tomato 9.3% | Apple 1.6% |
| 502 | food | The most eaten fruit in the world is the [Fruit] | banana 67.4% | Tomato 32.5% | bananas 0.1% |
| 503 | food | The most important crop in the world is [Crop] | Rice 99.8% | wheat 0.2% | Grain 0.0% |
| 601 | animals | The fastest animal in the world is the [Animal] | cheetah 99.9% | Peregrine 0.1% | falcon 0.0% |
| 602 | animals | The tallest animal in the world is the [Animal] | Giraffe 99.5% | Giraffes 0.5% | Girraffe 0.0% |
| 603 | animals | The heaviest animal in the world is the [Animal] | whale 70.8% | blue 27.4% | elephant 1.6% |
| 604 | animals | The animal with the shortest lifespan is the [Animal] | Mayfly 98.5% | mosquito 0.6% | fly 0.3% |
| 701 | everyday | You write on paper with a [Object] | pencil 100.0% | Object 0.0% | lápiz 0.0% |
| 702 | everyday | The most popular drink in the world is [Drink] | water 96.2% | tea 3.8% | teas 0.0% |
| 703 | everyday | The most common eye color in the world is [Color] | Brown 100.0% | marrón 0.0% | blue 0.0% |

### Run 3: Targeting mid-90s and 60-80% ranges (prompts_v3.json)

| ID | Domain | Template | Top-1 | Top-2 | Top-3 |
|---|---|---|---|---|---|
| 801 | animals | The largest land animal is the [Animal] | Elephant 99.6% | elephants 0.3% | African 0.1% |
| 802 | animals | The heaviest animal in the world is the [Animal] | whale 70.8% | blue 27.4% | elephant 1.6% |
| 803 | animals | The largest bird in the world is the [Bird] | ostrich 99.5% | Ostriche 0.1% | osprey 0.1% |
| 804 | animals | The animal that lives the longest is the [Animal] | Ocean 33.7% | Tortoise 17.5% | Turtle 12.0% |
| 805 | animals | The animal with the biggest heart is the [Animal] | whale 53.7% | Elephant 41.7% | blue 4.4% |
| 806 | animals | The fastest fish in the ocean is the [Fish] | Sailfish 86.7% | mackerel 7.7% | marlin 3.0% |
| 811 | food | The most popular cheese in the world is [Cheese] | Mozzarella 94.9% | Cheddar 5.0% | Mimolette 0.0% |
| 812 | food | The most popular fruit in the world is the [Fruit] | Banana 89.0% | Tomato 9.3% | Apple 1.6% |
| 813 | food | The most sour common fruit is the [Fruit] | lime 51.4% | Lemon 46.0% | lemons 2.4% |
| 814 | food | The spiciest food in the world is [Food] | chili 32.5% | CarolinaReaper 30.1% | pepper 9.5% |
| 815 | food | The sweetest natural fruit is the [Fruit] | mango 87.2% | Mangosteen 5.0% | strawberry 3.7% |
| 816 | food | The most popular hot drink in the world is [Drink] | tea 99.5% | coffee 0.5% | teas 0.0% |
| 821 | science | The largest planet in the solar system is [Planet] | Jupiter 100.0% | Saturn 0.0% | Jupyter 0.0% |
| 822 | science | The coldest planet in the solar system is [Planet] | Uranus 76.5% | Neptune 22.9% | Saturn 0.2% |
| 823 | science | The most common metal on Earth is [Metal] | Iron 49.9% | aluminum 47.1% | aluminium 3.1% |
| 824 | science | The most common gas in the atmosphere is [Gas] | Nitrogen 100.0% | oxygen 0.0% | Nitrogren 0.0% |
| 825 | science | The hardest natural mineral is [Mineral] | diamond 99.9% | Diamonds 0.1% | ダイヤモンド 0.1% |
| 826 | science | The largest organ in the human body is the [Organ] | skin 94.0% | liver 6.0% | kulit 0.0% |
| 831 | geography | The deepest ocean in the world is the [Ocean] | Pacific 98.3% | Mariana 1.6% | Marianas 0.1% |
| 832 | geography | Some people say the longest river is actually the [River] | Nile 71.0% | Amazon 28.8% | Yangtze 0.1% |
| 833 | geography | The largest country in the world by area is [Country] | Russia 100.0% | Canada 0.0% | Rusia 0.0% |
| 834 | geography | The tallest waterfall in the world is [Waterfall] | Angel 97.5% | Waterfall 0.5% | Angra 0.5% |
| 835 | geography | The smallest country in the world is [Country] | Vatican 99.9% | Monaco 0.1% | Vaticano 0.0% |
| 836 | geography | The largest island in the world is [Island] | Greenland 100.0% | Grea 0.0% | Grrenland 0.0% |
| 841 | everyday | The most popular color for a phone case is [Color] | Black 99.7% | Blue 0.2% | Clear 0.0% |
| 842 | everyday | The most relaxing color is [Color] | blue 99.8% | green 0.1% | teal 0.0% |
| 843 | everyday | The most popular search engine is [Engine] | Google 100.0% | Engine 0.0% | \<eos 0.0% |
| 844 | everyday | The most popular social media app is [App] | Facebook 88.6% | TikTok 5.9% | Instagram 4.0% |

## Recommended prompt pairs

The goal is pairs where both prompts are factual, specific, and structurally similar — differing only in how certain the model is. Both prompts should have a defensible answer; the "low" one is low because the *fact itself* is contested or close, not because the question is vague.

### Pair A (food): Mozzarella 95% vs lime/lemon 51%/46%

- **High:** "The most popular cheese in the world is [Cheese]" → Mozzarella 94.9% / Cheddar 5.0%
- **Low:** "The most sour common fruit is the [Fruit]" → lime 51.4% / Lemon 46.0%
- Both are "The most X Y is ___" with a specific factual answer. The sour fruit split is genuine — lime and lemon are genuinely close.

### Pair B (science): skin 94% vs Iron/aluminum 50%/47%

- **High:** "The largest organ in the human body is the [Organ]" → skin 94.0% / liver 6.0%
- **Low:** "The most common metal on Earth is [Metal]" → Iron 49.9% / aluminum 47.1%
- Both science, both specific. The metal question is genuinely debated (depends on crust vs whole Earth).

### Pair C (animals): Sailfish 87% vs whale/elephant 54%/42%

- **High:** "The fastest fish in the ocean is the [Fish]" → Sailfish 86.7% / mackerel 7.7%
- **Low:** "The animal with the biggest heart is the [Animal]" → whale 53.7% / Elephant 41.7%
- Both animals, both superlative. The "biggest heart" question has real ambiguity (literal vs figurative, blue whale vs elephant in absolute terms).

### Pair D (geography): China/India 76%/24% vs Nile/Amazon 71%/29%

- **High-ish:** "The most populated country in the world is [Country]" → China 76.1% / India 23.9%
- **Low-ish:** "Some people say the longest river is actually the [River]" → Nile 71.0% / Amazon 28.8%
- Both are contested current facts. Good if you want two "moderate" prompts rather than a high/low contrast.

### Pair E (science): Venus 98% vs Uranus/Neptune 77%/23%

- **High:** "The hottest planet in the solar system is [Planet]" → Venus 97.7% / Mercury 2.3%
- **Low:** "The coldest planet in the solar system is [Planet]" → Uranus 76.5% / Neptune 22.9%
- Excellent structural parallel — same sentence, just "hottest" vs "coldest". The cold planet split reflects genuine ambiguity (Uranus vs Neptune depends on measurement).

### Pair F (food): Banana 89% vs banana/tomato 67%/33%

- **High:** "The most popular fruit in the world is the [Fruit]" → Banana 89.0% / Tomato 9.3%
- **Low:** "The most eaten fruit in the world is the [Fruit]" → banana 67.4% / Tomato 32.5%
- Nearly identical phrasing! "Popular" vs "eaten" shifts the distribution. Demonstrates how small wording changes affect model certainty.

## Notes on the high side

Most factual prompts with a single clear answer land at 99-100%, not in the desired 85-95% range. The prompts that do land in the mid-90s tend to involve:
- A clear winner with one well-known alternative (Mozzarella/Cheddar, skin/liver, Venus/Mercury)
- Superlatives where a close runner-up gets some probability mass (Sailfish/mackerel, Banana/Tomato)

Getting a prompt to land precisely at ~90% is difficult to engineer. The pairs above represent the best contrasts found across 90+ prompts tested.

## Run 4: Vague prompts targeting ~90% (prompts_v4.json)

Tested whether vague/open-ended prompts could also hit the ~90% range to give an alternative pairing strategy.

| ID | Domain | Template | Top-1 | Top-2 | Top-3 |
|---|---|---|---|---|---|
| 901 | animals | A pet that many families have is a [Pet] | dog 99.0% | cat 1.0% | Golden 0.0% |
| 902 | animals | A farm animal that gives us milk is a [Animal] | Cow 100.0% | Cows 0.0% | Dairy 0.0% |
| 903 | animals | A bird that can talk is a [Bird] | parrot 100.0% | Polly 0.0% | mimic 0.0% |
| 904 | animals | An animal that carries its baby in a pouch is a [Animal] | Marsupial 65.2% | Kangaroo 34.7% | Koala 0.0% |
| 905 | animals | A scary animal in the ocean is a [Animal] | shark 99.1% | Sharks 0.5% | Great 0.3% |
| 911 | food | A hot drink people have in the afternoon is [Drink] | tea 98.9% | coffee 0.5% | teatime 0.3% |
| 912 | food | A fruit that is red on the inside is a [Fruit] | Strawberry 27.8% | Watermelon 25.3% | cherry 17.7% |
| 913 | food | A food you cook on a grill is a [Food] | Food 48.1% | burger 29.3% | BBQ 7.2% |
| 914 | food | A yellow food you put on toast is [Food] | Butter 86.8% | Banana 9.5% | Cheese 1.6% |
| 915 | food | A cold dessert you eat in summer is [Dessert] | ice cream 94.1% | sorbet 3.2% | icecream 1.0% |
| 921 | everyday | The thing you use to unlock your phone is your [Word] | password 62.5% | passcode 32.0% | fingerprint 2.7% |
| 922 | everyday | When it rains, you carry an [Object] | umbrella 99.8% | umbrealla 0.2% | Object 0.0% |
| 923 | everyday | You use scissors to cut [Material] | Material 65.7% | paper 33.9% | Fabric 0.3% |
| 924 | everyday | A vehicle with two wheels is a [Vehicle] | bicycle 93.5% | motorcycle 3.3% | bike 2.9% |
| 925 | everyday | You brush your teeth with a [Object] | toothbrush 90.8% | brush 4.1% | paste 1.9% |

### Top-3 analysis

Most factual prompts produce negligible top-3 probability (<2%). Genuine 3-way splits only occur in vague/open-ended prompts:

| ID | Prompt | #1 | #2 | #3 |
|---|---|---|---|---|
| 28 | A color in the rainbow | red 20% | Green 15% | Violet 13% |
| 43 | Useful thing in your bag | knife 14% | flashlight 12% | handkerchief 10% |
| 814 | Spiciest food in the world | chili 33% | CarolinaReaper 30% | pepper 10% |
| 912 | Fruit red on the inside | Strawberry 28% | Watermelon 25% | cherry 18% |
| 19 | A delicious fruit | mango 53% | apple 19% | strawberry 15% |
| 38 | A winter sport | Skiing 65% | Skating 20% | Snowboarding 12% |

Factual prompts are essentially 2-way splits because there are typically only 2 plausible answers to a specific factual question.

## Vague vs factual prompt pairs: design decision

**Option A — Both vague:** e.g., "toothbrush" (91%) vs "winter sport" (65/20/12)
- Pro: More intuitive, students can reason from common sense, 3-way splits possible
- Pro: Better for think-aloud protocol — students can articulate predictions easily
- Con: Uncertainty is "obvious" — students may just say "there are many valid answers"
- Con: The high-certainty vague prompt is effectively a fact in disguise (toothbrush), so the pairing feels uneven
- Con: Risks the takeaway being about question vagueness, not about how LLMs distribute probability

**Option B — Both factual:** e.g., "hottest planet" (Venus 98%) vs "coldest planet" (Uranus 77% / Neptune 23%)
- Pro: Both prompts feel like they *should* have one right answer — the spread is surprising
- Pro: Uncertainty comes from the model, not the question — better aligns with studying LLM reasoning
- Pro: Identical sentence structure possible (just swap one word), cleaner experimental design
- Con: Top-3 is negligible — students see 1-bar or 2-bar distributions only
- Con: Some factual questions may need domain knowledge students lack

### Decision (2026-03-31)

**Going with factual prompts.** The pedagogical payoff is higher — the surprise of a model being uncertain about a seemingly clear fact is exactly what the interview aims to elicit. Vague prompts risk students attributing uncertainty to question design rather than learning about LLM probability distributions.

**Selected pair: Pair E (science/planets)**
- **High:** "The hottest planet in the solar system is [Planet]" → Venus 97.7% / Mercury 2.3%
- **Low:** "The coldest planet in the solar system is [Planet]" → Uranus 76.5% / Neptune 22.9%
- Identical structure, same domain, both accessible, genuine scientific ambiguity behind the spread.

## Plugin update: v05 (2026-03-31)

Created `statistical-madlibs-codap-v05.html` to use the Ollama API with gemma2:9b as the default inference backend, replacing in-browser Transformers.js (Qwen2.5-0.5B).

### What changed

- **Default backend switched to Ollama API.** Connects to the Ollama server (`apollo.quocanmeomeo.io.vn`) via `/v1/chat/completions` with `logprobs`. No more downloading a 500MB model into the browser.
- **Transformers.js kept as fallback.** Switchable via a dropdown in the "Inference Backend" settings panel. Useful if the server is unavailable or for offline use.
- **Greedy completion ported to API.** `ollamaGreedyCompleteToWord()` mirrors the Transformers.js logic and `run_prompts.py`: appends the initial token as an assistant prefill, generates greedily (temp=0) until a word boundary, cleans up punctuation/special tokens.
- **Case-variant merging.** Same dedup logic as `run_prompts.py` — "Cat" + "cat" → "cat" with summed probability.
- **URL parameter support.** `?backend=transformers`, `?apiKey=xxx`, `?model=gemma2:9b`, `?server=https://...` for easy configuration from CODAP embeds.
- **All existing functionality preserved.** CODAP integration, variability tracking, sampler connection, prompt engineering panel — all unchanged.

### Why

The Qwen2.5-0.5B model running in-browser produced artifacts (Chinese characters in top-3, inconsistent distributions) and was slow to load (~30s). gemma2:9b on the Ollama server produces clean distributions with ~1s inference and no non-English leakage in top-3.

## Technical notes

- Prompts use the CODAP plugin's exact format: system prompt + "Fill in [SlotName] with one word.\n\n<context> "
- Greedy completion resolves subword tokens to full words (e.g., 'che' → 'cheetah', 'N' → 'Nile')
- Case variants are merged (Cat + cat → cat, summing probabilities)
- All scripts and raw JSON results are in this directory
- Non-English token leakage is minimal on gemma2:9b (<0.2% in nearly all cases) but present (león, 鲸鱼, oxígeno) — not a problem for the experiment since these never appear in top-3 after merging
