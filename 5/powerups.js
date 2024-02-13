const powerups = {
  list: ['flight', 'shield', 'aim', 'triple', 'speed', 'mine', 'doublejump', 'invert', 'djws', 'bot'],
  'flight': {
    quantity: 3,
    color: 'b624ff',
    image: 0,
    type: 'movement',
    name: 'flight',
    description: '3s. | vous pouvez voler'
  },
  'shield': {
    quantity: 8,
    color: '2424ff',
    image: 1,
    type: 'movement',
    name: 'shield',
    description: '8s. | vous cr~ee un bouclier de projectiles'
  },
  'aim': {
    quantity: 3,
    color: '249200',
    image: 2,
    type: 'projectile',
    name: 'aim',
    description: 'x3 | vos projectiles visent l\'ennemi'
  },
  'triple': {
    quantity: 5,
    color: '24ffff',
    image: 3,
    type: 'projectile',
    name: 'triple',
    description: 'x5 | triple vos projectiles'
  },
  'speed': {
    quantity: 5,
    color: 'ff6d00',
    image: 4,
    type: 'movement',
    name: 'speed',
    description: '5s. | vitesse de movement lat~eral accrue'
  },
  'mine': {
    quantity: 5,
    color: 'ffb600',
    image: 5,
    type: 'projectile',
    name: 'mine',
    description: 'x5 | vos projectiles sont entour~es d\'un\nbouclier qui persiste apr`es leur disparition'
  },
  'doublejump': {
    quantity: 5,
    color: 'ffffff',
    image: 6,
    type: 'movement',
    name: 'doublejump',
    description: 'x5 | double saut cr~eant un projectile'
  },
  'invert': {
    quantity: 1,
    color: '00ffff',
    image: 7,
    type: 'movement',
    name: 'invert',
    description: 'x1 | les projectiles adverses tournent de 180°\net vous appartiennent'
  },
  'djws': {
    quantity: 25,
    color: 'ffffff',
    image: 8,
    type: 'movement',
    name: 'djws',
    description: 'x25 | double saut'
  },
  'bot': {
    quantity: NaN,
    color: 'ffffff',
    image: 9,
    type: 'movement',
    name: 'bot',
    description: '2s. apr`es avoir ~et~e ramass~e, place un robot qui\na 3 charges et tirera sur vos ennemis'
  },
}
