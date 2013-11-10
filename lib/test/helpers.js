
var assert = require("assert");

suite("helpers", function()
{
  var _helpers = require("../helpers");

  suite("decodeRepositoryUrl", function()
  {
    test("Parse /com/test/dummy/1.0.0/dummy-1.0.0.tgz", function(done)
    {
      var expectedResult = {
        groupId: "com.test",
        artifactId: "dummy",
        version: "1.0.0",
        filename: "dummy-1.0.0.tgz",
        extension: "tgz",
        classifier: false
      };
      
      _helpers.decodeRepositoryUrl("/com/test/dummy/1.0.0/dummy-1.0.0.tgz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
          
        assert.deepEqual(expectedResult, result);
        done();
      });
    });
    
    test("Parse /com/test/dummy/1.0.0/dummy-1.0.0-src.tgz", function(done)
    {
      var expectedResult = {
        groupId: "com.test",
        artifactId: "dummy",
        version: "1.0.0",
        filename: "dummy-1.0.0-src.tgz",
        extension: "tgz",
        classifier: "src"
      };
      
      _helpers.decodeRepositoryUrl("/com/test/dummy/1.0.0/dummy-1.0.0-src.tgz", function(error, result)
      {
        if  (error)
        {
          done(error);
          return;
        }
          
        assert.deepEqual(expectedResult, result);
        done();
      });
    });

  });
});
