import { Stat } from "#enums/stat";
import { StockpilingTag } from "#app/data/battler-tags";
import { allMoves } from "#app/data/move";
import { BattlerTagType } from "#app/enums/battler-tag-type";
import type { TurnMove } from "#app/field/pokemon";
import { MoveResult } from "#app/field/pokemon";
import GameManager from "#test/testUtils/gameManager";
import { Abilities } from "#enums/abilities";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import Phaser from "phaser";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MovePhase } from "#app/phases/move-phase";
import { TurnInitPhase } from "#app/phases/turn-init-phase";

describe("Moves - Spit Up", () => {
  let phaserGame: Phaser.Game;
  let game: GameManager;

  const spitUp = allMoves[Moves.SPIT_UP];

  beforeAll(() => {
    phaserGame = new Phaser.Game({ type: Phaser.HEADLESS });
  });

  afterEach(() => {
    game.phaseInterceptor.restoreOg();
  });

  beforeEach(() => {
    game = new GameManager(phaserGame);

    game.override.battleType("single");

    game.override.enemySpecies(Species.RATTATA);
    game.override.enemyMoveset(Moves.SPLASH);
    game.override.enemyAbility(Abilities.NONE);
    game.override.enemyLevel(2000);

    game.override.moveset(new Array(4).fill(spitUp.id));
    game.override.ability(Abilities.NONE);

    vi.spyOn(spitUp, "calculateBattlePower");
  });

  describe("consumes all stockpile stacks to deal damage (scaling with stacks)", () => {
    it("1 stack -> 100 power", async () => {
      const stacksToSetup = 1;
      const expectedPower = 100;

      await game.startBattle([ Species.ABOMASNOW ]);

      const pokemon = game.scene.getPlayerPokemon()!;
      pokemon.addTag(BattlerTagType.STOCKPILING);

      const stockpilingTag = pokemon.getTag(StockpilingTag)!;
      expect(stockpilingTag).toBeDefined();
      expect(stockpilingTag.stockpiledCount).toBe(stacksToSetup);

      game.move.select(Moves.SPIT_UP);
      await game.phaseInterceptor.to(TurnInitPhase);

      expect(spitUp.calculateBattlePower).toHaveBeenCalledOnce();
      expect(spitUp.calculateBattlePower).toHaveReturnedWith(expectedPower);

      expect(pokemon.getTag(StockpilingTag)).toBeUndefined();
    });

    it("2 stacks -> 200 power", async () => {
      const stacksToSetup = 2;
      const expectedPower = 200;

      await game.startBattle([ Species.ABOMASNOW ]);

      const pokemon = game.scene.getPlayerPokemon()!;
      pokemon.addTag(BattlerTagType.STOCKPILING);
      pokemon.addTag(BattlerTagType.STOCKPILING);

      const stockpilingTag = pokemon.getTag(StockpilingTag)!;
      expect(stockpilingTag).toBeDefined();
      expect(stockpilingTag.stockpiledCount).toBe(stacksToSetup);

      game.move.select(Moves.SPIT_UP);
      await game.phaseInterceptor.to(TurnInitPhase);

      expect(spitUp.calculateBattlePower).toHaveBeenCalledOnce();
      expect(spitUp.calculateBattlePower).toHaveReturnedWith(expectedPower);

      expect(pokemon.getTag(StockpilingTag)).toBeUndefined();
    });

    it("3 stacks -> 300 power", async () => {
      const stacksToSetup = 3;
      const expectedPower = 300;

      await game.startBattle([ Species.ABOMASNOW ]);

      const pokemon = game.scene.getPlayerPokemon()!;
      pokemon.addTag(BattlerTagType.STOCKPILING);
      pokemon.addTag(BattlerTagType.STOCKPILING);
      pokemon.addTag(BattlerTagType.STOCKPILING);

      const stockpilingTag = pokemon.getTag(StockpilingTag)!;
      expect(stockpilingTag).toBeDefined();
      expect(stockpilingTag.stockpiledCount).toBe(stacksToSetup);

      game.move.select(Moves.SPIT_UP);
      await game.phaseInterceptor.to(TurnInitPhase);

      expect(spitUp.calculateBattlePower).toHaveBeenCalledOnce();
      expect(spitUp.calculateBattlePower).toHaveReturnedWith(expectedPower);

      expect(pokemon.getTag(StockpilingTag)).toBeUndefined();
    });
  });

  it("fails without stacks", async () => {
    await game.startBattle([ Species.ABOMASNOW ]);

    const pokemon = game.scene.getPlayerPokemon()!;

    const stockpilingTag = pokemon.getTag(StockpilingTag)!;
    expect(stockpilingTag).toBeUndefined();

    game.move.select(Moves.SPIT_UP);
    await game.phaseInterceptor.to(TurnInitPhase);

    expect(pokemon.getMoveHistory().at(-1)).toMatchObject<TurnMove>({ move: Moves.SPIT_UP, result: MoveResult.FAIL, targets: [ game.scene.getEnemyPokemon()!.getBattlerIndex() ]});

    expect(spitUp.calculateBattlePower).not.toHaveBeenCalled();
  });

  describe("restores stat boosts granted by stacks", () => {
    it("decreases stats based on stored values (both boosts equal)", async () => {
      await game.startBattle([ Species.ABOMASNOW ]);

      const pokemon = game.scene.getPlayerPokemon()!;
      pokemon.addTag(BattlerTagType.STOCKPILING);

      const stockpilingTag = pokemon.getTag(StockpilingTag)!;
      expect(stockpilingTag).toBeDefined();

      game.move.select(Moves.SPIT_UP);
      await game.phaseInterceptor.to(MovePhase);

      expect(pokemon.getStatStage(Stat.DEF)).toBe(1);
      expect(pokemon.getStatStage(Stat.SPDEF)).toBe(1);

      await game.phaseInterceptor.to(TurnInitPhase);

      expect(pokemon.getMoveHistory().at(-1)).toMatchObject<TurnMove>({ move: Moves.SPIT_UP, result: MoveResult.SUCCESS, targets: [ game.scene.getEnemyPokemon()!.getBattlerIndex() ]});

      expect(spitUp.calculateBattlePower).toHaveBeenCalledOnce();

      expect(pokemon.getStatStage(Stat.DEF)).toBe(0);
      expect(pokemon.getStatStage(Stat.SPDEF)).toBe(0);

      expect(pokemon.getTag(StockpilingTag)).toBeUndefined();
    });

    it("decreases stats based on stored values (different boosts)", async () => {
      await game.startBattle([ Species.ABOMASNOW ]);

      const pokemon = game.scene.getPlayerPokemon()!;
      pokemon.addTag(BattlerTagType.STOCKPILING);

      const stockpilingTag = pokemon.getTag(StockpilingTag)!;
      expect(stockpilingTag).toBeDefined();

      // for the sake of simplicity (and because other tests cover the setup), set boost amounts directly
      stockpilingTag.statChangeCounts = {
        [Stat.DEF]: -1,
        [Stat.SPDEF]: 2,
      };

      game.move.select(Moves.SPIT_UP);
      await game.phaseInterceptor.to(TurnInitPhase);

      expect(pokemon.getMoveHistory().at(-1)).toMatchObject<TurnMove>({ move: Moves.SPIT_UP, result: MoveResult.SUCCESS, targets: [ game.scene.getEnemyPokemon()!.getBattlerIndex() ]});

      expect(spitUp.calculateBattlePower).toHaveBeenCalledOnce();

      expect(pokemon.getStatStage(Stat.DEF)).toBe(1);
      expect(pokemon.getStatStage(Stat.SPDEF)).toBe(-2);

      expect(pokemon.getTag(StockpilingTag)).toBeUndefined();
    });
  });
});
