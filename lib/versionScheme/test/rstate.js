
var assert = require("assert");

suite("rstate", function()
{
  var _rstate = require("../rstate");
  
  suite("valid", function()
  {
    var valid = [ "R1A01", "R1A99", "R1AA01", "R1AA99", "R1ZZ01", "R1ZZ99", "R99A01", "R99A99", "R99AA01", "R99AA99", "R99ZZ01", "R99ZZ99" ];
    var invalid = [ "R1A00", "R1A001", "R1AA00", "R1AAA", "R1I", "R1O", "R1Q", "R1R", "R1W", "X1", "RA12" ];
    
    for (var n = 0; n < valid.length; n++)
    {
      test("Test if " + valid[n] + " is valid", function(value) 
      {
        return function()
        {
          assert.ok(_rstate.valid(value), value + " should be valid");
        };
      }(valid[n]));
    }
    
    for (var n = 0; n < invalid.length; n++)
    {
      test("Test if " + invalid[n] + " is invalid", function(value) 
      {
        return function()
        {
          assert.equal(_rstate.valid(value), false, value + " should not be valid");
        };
      }(invalid[n]));
    }
  });
  
  suite("next", function()
  {
    // invalid: I O P Q R W
    
    test("Test R1A01 -> R1A02", function()
    {
      assert.equal(_rstate.next("R1A01"), "R1A02");
    });
    
    test("Test R1A99 -> R1B01", function()
    {
      assert.equal(_rstate.next("R1A99"), "R1B01");
    });
    
    test("Test R1A -> R1B", function()
    {
      assert.equal(_rstate.next("R1A"), "R1B");
    });
    
    test("Test R1Z -> R1AA", function()
    {
      assert.equal(_rstate.next("R1Z"), "R1AA");
    });

    test("Test R1AA -> R1AB", function()
    {
      assert.equal(_rstate.next("R1AA"), "R1AB");
    });
    
    test("Test R1ZZ -> R2A", function()
    {
      assert.equal(_rstate.next("R1ZZ"), "R2A");
    });
        
    test("Test R9ZZ -> R10A", function()
    {
      assert.equal(_rstate.next("R9ZZ"), "R10A");
    });
     
    test("Test R99ZZ -> false", function()
    {
      assert.equal(_rstate.next("R99ZZ"), false);
    });
    
    test("Test R1H -> R1J", function()
    {
      assert.equal(_rstate.next("R1H"), "R1J");
    });
    
    test("Test R1N -> R1S", function()
    {
      assert.equal(_rstate.next("R1N"), "R1S");
    });
        
    test("Test R1V -> R1X", function()
    {
      assert.equal(_rstate.next("R1V"), "R1X");
    });
  });
  
  suite("settings", function()
  {
    test("Test Prototype mode", function()
    {
      _rstate.settings({ prototype: true });
      assert.equal(_rstate.next("P1A01"), "P1A02");
      assert.ok(_rstate.valid("P1A01"), "P1A01 should be valid");
    });
  });
});
